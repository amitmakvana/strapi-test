import "dotenv/config";

const SOURCE_URL = (process.env.STRAPI_SOURCE_URL || process.env.STRAPI_CLOUD_URL || "").replace(/\/$/, "");
const SOURCE_TOKEN = process.env.STRAPI_SOURCE_TOKEN || process.env.STRAPI_CLOUD_TOKEN || "";
const TARGET_URL = (process.env.STRAPI_TARGET_URL || "http://localhost:1337").replace(/\/$/, "");
const TARGET_TOKEN = process.env.STRAPI_TARGET_TOKEN || "";

if (!SOURCE_URL) {
  console.error("Missing STRAPI_SOURCE_URL (or STRAPI_CLOUD_URL).");
  process.exit(1);
}

if (!TARGET_TOKEN) {
  console.error("Missing STRAPI_TARGET_TOKEN.");
  process.exit(1);
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function absoluteMediaUrl(base, maybeUrl) {
  if (!maybeUrl) return null;
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
  return `${base}${maybeUrl.startsWith("/") ? "" : "/"}${maybeUrl}`;
}

function sourceMediaUrl(item, fieldName) {
  const media = item?.[fieldName];
  if (!media) return null;
  const direct = media?.url || media?.data?.attributes?.url || media?.data?.url;
  return absoluteMediaUrl(SOURCE_URL, direct);
}

function normalizePost(item) {
  const attrs = item?.attributes || item;
  return {
    title: attrs?.title || "Untitled",
    slug: attrs?.slug,
    category: attrs?.category || "General",
    excerpt: attrs?.excerpt || attrs?.description || null,
    description: attrs?.description || attrs?.excerpt || null,
    content: attrs?.content || "",
    date: attrs?.date || attrs?.publishDate || attrs?.publishedAt || null,
    author: attrs?.author || attrs?.authorName || "Editorial Team",
    readTime: attrs?.readTime || null,
    metaTitle: attrs?.metaTitle || attrs?.title || null,
    metaDescription: attrs?.metaDescription || attrs?.description || null,
    coverImageUrl: sourceMediaUrl(attrs, "image"),
    metaImageUrl: sourceMediaUrl(attrs, "metaImage"),
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText} -> ${text.slice(0, 300)}`);
  }
  return response.json();
}

async function fetchSourcePosts() {
  const posts = [];
  let page = 1;

  while (true) {
    const qs = new URLSearchParams({
      "pagination[page]": String(page),
      "pagination[pageSize]": "100",
      "status": "published",
      "populate[image][fields][0]": "url",
      "populate[metaImage][fields][0]": "url",
    });
    const url = `${SOURCE_URL}/api/blogs?${qs.toString()}`;
    const json = await fetchJson(url, { headers: authHeaders(SOURCE_TOKEN) });
    const data = Array.isArray(json?.data) ? json.data : [];
    posts.push(...data.map(normalizePost).filter((p) => p.slug));

    const totalPages = json?.meta?.pagination?.pageCount || 1;
    if (page >= totalPages) break;
    page += 1;
  }

  return posts;
}

async function findTargetBySlug(slug) {
  const qs = new URLSearchParams({
    "filters[slug][$eq]": slug,
    "pagination[pageSize]": "1",
    "status": "draft",
  });
  const url = `${TARGET_URL}/api/blogs?${qs.toString()}`;
  const json = await fetchJson(url, { headers: authHeaders(TARGET_TOKEN) });
  return json?.data?.[0] || null;
}

async function uploadImageFromUrl(imageUrl, nameHint) {
  if (!imageUrl) return null;
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) return null;

  const arrayBuffer = await imageRes.arrayBuffer();
  const mimeType = imageRes.headers.get("content-type") || "image/jpeg";
  const ext = mimeType.split("/")[1] || "jpg";
  const filename = `${nameHint || "image"}.${ext}`.replace(/[^\w.-]+/g, "-");
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const form = new FormData();
  form.append("files", blob, filename);

  const uploaded = await fetchJson(`${TARGET_URL}/api/upload`, {
    method: "POST",
    headers: authHeaders(TARGET_TOKEN),
    body: form,
  });
  return Array.isArray(uploaded) && uploaded[0]?.id ? uploaded[0].id : null;
}

async function publishTarget(documentId) {
  if (!documentId) return;
  try {
    await fetch(`${TARGET_URL}/api/blogs/${documentId}/actions/publish`, {
      method: "POST",
      headers: authHeaders(TARGET_TOKEN),
    });
  } catch {
    // Keep migration resilient even if publish endpoint differs.
  }
}

async function upsertTargetPost(post) {
  const existing = await findTargetBySlug(post.slug);
  const imageId = await uploadImageFromUrl(post.coverImageUrl, `${post.slug}-cover`);
  const metaImageId = await uploadImageFromUrl(post.metaImageUrl || post.coverImageUrl, `${post.slug}-meta`);

  const data = {
    title: post.title,
    slug: post.slug,
    category: post.category,
    excerpt: post.excerpt,
    description: post.description,
    content: post.content,
    date: post.date,
    author: post.author,
    readTime: post.readTime,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    ...(imageId ? { image: imageId } : {}),
    ...(metaImageId ? { metaImage: metaImageId } : {}),
  };

  if (existing?.documentId || existing?.id) {
    const documentId = existing.documentId || existing.id;
    await fetchJson(`${TARGET_URL}/api/blogs/${documentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders(TARGET_TOKEN) },
      body: JSON.stringify({ data }),
    });
    await publishTarget(documentId);
    return "updated";
  }

  const created = await fetchJson(`${TARGET_URL}/api/blogs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(TARGET_TOKEN) },
    body: JSON.stringify({ data }),
  });
  const newId = created?.data?.documentId || created?.data?.id;
  await publishTarget(newId);
  return "created";
}

async function main() {
  console.log(`Fetching published blogs from: ${SOURCE_URL}`);
  const sourcePosts = await fetchSourcePosts();
  console.log(`Found ${sourcePosts.length} blog(s) to migrate.`);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const post of sourcePosts) {
    try {
      const result = await upsertTargetPost(post);
      if (result === "created") created += 1;
      if (result === "updated") updated += 1;
      console.log(`${result === "created" ? "✓" : "↻"} ${post.slug}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${post.slug}: ${error.message}`);
    }
  }

  console.log(`\nMigration done -> created: ${created}, updated: ${updated}, failed: ${failed}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
