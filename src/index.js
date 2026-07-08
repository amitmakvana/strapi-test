'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// Windows upload fix (WebP temp file lock)
(function patchWindowsUploadCleanup() {
  const retry = async (fn, target) => {
    for (let i = 0; i < 5; i += 1) {
      try {
        return await fn(target);
      } catch (error) {
        const locked = error.code === 'EBUSY' || error.code === 'EPERM';
        if (locked && i < 4) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
          continue;
        }
        if (locked) {
          setTimeout(() => fn(target).catch(() => {}), 3000);
          return;
        }
        throw error;
      }
    }
  };

  const fse = require('fs-extra');
  const origRemove = fse.remove.bind(fse);
  const origUnlink = fs.promises.unlink.bind(fs.promises);

  fse.remove = (target) => (
    String(target).includes('strapi-upload-') ? retry(origRemove, target) : origRemove(target)
  );
  fs.promises.unlink = (target) => (
    /strapi-upload-|optimized-/.test(String(target)) ? retry(origUnlink, target) : origUnlink(target)
  );
})();

const BLOG_UID = 'api::blog.blog';
const BLOG_ACTIONS = ['api::blog.blog.find', 'api::blog.blog.findOne'];

function extractPost(item) {
  if (!item) return null;
  return item.attributes ? { id: item.id, ...item.attributes } : item;
}

function getContent(post) {
  const c = post.content;
  if (typeof c === 'string') return c;
  if (c?.body) return c.body;
  if (c?.markdown) return c.markdown;
  return '';
}

function computeReadTime(content) {
  if (typeof content !== 'string' || !content.trim()) return 1;
  const words = content.replace(/[#>*_`~-]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function loadRecoveredBySlug() {
  const filePath = path.join(__dirname, '..', 'data', 'recovered-blogs.json');
  if (!fs.existsSync(filePath)) return new Map();
  const posts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return new Map((Array.isArray(posts) ? posts : []).map((post) => [post.slug, post]));
}

function toDateOnly(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function toBlogData(post) {
  const seo = post.seo && typeof post.seo === 'object' ? post.seo : null;
  const excerpt = post.excerpt || post.description || null;
  const content = getContent(post);

  return {
    title: post.title || 'Untitled',
    slug: post.slug,
    category: post.category || 'General',
    excerpt,
    description: post.description || excerpt || null,
    content,
    date: toDateOnly(post.date || post.publishDate || post.publishedAt),
    author: post.author || post.authorName || post.author?.name || 'FiveTec Editorial Team',
    readTime: post.readTime || computeReadTime(content),
    metaTitle: post.metaTitle || seo?.metaTitle || post.title,
    metaDescription: post.metaDescription || seo?.metaDescription || excerpt,
  };
}

async function publishBlogDocument(strapi, documentId) {
  if (!documentId) return;
  await strapi.documents(BLOG_UID).publish({ documentId });
}

async function upsertBlogPost(strapi, post, bySlug) {
  if (!post.slug) return 'skipped';

  const data = toBlogData(post);
  const existing = bySlug.get(post.slug);

  if (existing?.documentId) {
    await strapi.documents(BLOG_UID).update({
      documentId: existing.documentId,
      data,
    });
    await publishBlogDocument(strapi, existing.documentId);
    return 'updated';
  }

  const created = await strapi.documents(BLOG_UID).create({ data });
  if (created?.documentId) {
    await publishBlogDocument(strapi, created.documentId);
    bySlug.set(post.slug, created);
    return 'created';
  }

  return 'skipped';
}

function hasMediaField(post, fieldName) {
  const value = post?.[fieldName];
  if (!value) return false;
  if (typeof value === 'object') {
    return Boolean(value.id || value.documentId || value.url);
  }
  return Boolean(value);
}

async function uploadImageFromUrl(strapi, imageUrl, title, attempt = 1) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Download failed (${response.status})`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const urlObj = new URL(imageUrl);
  const filename = path.basename(urlObj.pathname) || 'cover.jpg';
  const mime = response.headers.get('content-type') || 'image/jpeg';
  const tmpPath = path.join(os.tmpdir(), `strapi-cover-${Date.now()}-${filename}`);

  await fs.promises.writeFile(tmpPath, buffer);
  const stat = await fs.promises.stat(tmpPath);

  try {
    const uploaded = await strapi.plugin('upload').service('upload').upload({
      data: {
        fileInfo: {
          name: filename,
          alternativeText: title,
        },
      },
      files: {
        filepath: tmpPath,
        originalFilename: filename,
        mimetype: mime,
        size: stat.size,
      },
    });

    return Array.isArray(uploaded) ? uploaded[0] : uploaded;
  } catch (error) {
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return uploadImageFromUrl(strapi, imageUrl, title, attempt + 1);
    }
    throw error;
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await fs.promises.unlink(tmpPath).catch(() => {});
  }
}

async function syncCoverImages(strapi) {
  const recoveredBySlug = loadRecoveredBySlug();
  const posts = await strapi.documents(BLOG_UID).findMany({
    limit: 500,
    populate: ['image', 'metaImage'],
  });

  let attached = 0;

  for (const post of posts) {
    const imageUrl = recoveredBySlug.get(post.slug)?.coverImageUrl;
    if (hasMediaField(post, 'image') || !imageUrl) continue;

    try {
      const file = await uploadImageFromUrl(strapi, imageUrl, post.title || post.slug);
      if (!file?.id) continue;

      await strapi.documents(BLOG_UID).update({
        documentId: post.documentId,
        data: {
          image: file.id,
          metaImage: file.id,
        },
      });
      await publishBlogDocument(strapi, post.documentId);
      attached += 1;
    } catch (error) {
      strapi.log.warn(`Cover image skipped for ${post.slug}: ${error.message}`);
    }
  }

  if (attached > 0) {
    strapi.log.info(`Attached ${attached} cover image(s) to Strapi media library`);
  }
}

async function configureUploadSettings(strapi) {
  const uploadService = strapi.plugin('upload').service('upload');
  const current = (await uploadService.getSettings()) || {};

  await uploadService.setSettings({
    ...current,
    sizeOptimization: false,
    responsiveDimensions: false,
    autoOrientation: false,
  });
}

async function configureBlogAdminLayout(strapi) {
  const contentTypeService = strapi.plugin('content-manager').service('content-types');
  const contentType = contentTypeService.findContentType(BLOG_UID);
  if (!contentType) return;

  // Re-sync CM config from schema.json (includes config.layouts), then force Cloud layout.
  await contentTypeService.syncConfigurations();

  const current = await contentTypeService.findConfiguration(contentType);
  const blogLayout = {
    list: ['title', 'slug', 'category', 'date'],
    edit: [
      [{ name: 'title', size: 6 }, { name: 'slug', size: 6 }],
      [{ name: 'excerpt', size: 6 }, { name: 'description', size: 6 }],
      [{ name: 'category', size: 6 }, { name: 'date', size: 6 }],
      [{ name: 'author', size: 12 }],
      [{ name: 'readTime', size: 6 }, { name: 'metaTitle', size: 6 }],
      [{ name: 'metaDescription', size: 6 }, { name: 'image', size: 6 }],
      [{ name: 'metaImage', size: 12 }],
      [{ name: 'content', size: 12 }],
    ],
  };

  await contentTypeService.updateConfiguration(contentType, {
    ...current,
    settings: {
      ...(current.settings || {}),
      mainField: 'title',
      defaultSortBy: 'date',
      defaultSortOrder: 'DESC',
    },
    layouts: blogLayout,
  });

  strapi.log.info('Blog admin layout configured');
}

async function enablePublicBlogPermissions(strapi) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });
  if (!publicRole) return;

  for (const action of BLOG_ACTIONS) {
    const permission = await strapi.db.query('plugin::users-permissions.permission').findOne({
      where: { role: publicRole.id, action },
    });

    if (!permission) {
      await strapi.db.query('plugin::users-permissions.permission').create({
        data: { action, role: publicRole.id, enabled: true },
      });
    } else if (!permission.enabled) {
      await strapi.db.query('plugin::users-permissions.permission').update({
        where: { id: permission.id },
        data: { enabled: true },
      });
    }
  }
}

async function syncFromRecoveredFile(strapi) {
  const filePath = path.join(__dirname, '..', 'data', 'recovered-blogs.json');
  if (!fs.existsSync(filePath)) return 0;

  const posts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(posts) || posts.length === 0) return 0;

  const localPosts = await strapi.documents(BLOG_UID).findMany({ limit: 500 });
  const bySlug = new Map((localPosts || []).map((p) => [p.slug, p]).filter(([slug]) => slug));

  let created = 0;
  let updated = 0;

  for (const post of posts) {
    const result = await upsertBlogPost(strapi, post, bySlug);
    if (result === 'created') created += 1;
    if (result === 'updated') updated += 1;
  }

  if (created > 0 || updated > 0) {
    strapi.log.info(`Recovered blogs synced: ${created} created, ${updated} updated`);
  }

  return created + updated;
}

async function seedBlogsIfEmpty(strapi) {
  const existing = await strapi.documents(BLOG_UID).findMany({ limit: 1 });
  if (existing?.length > 0) return;

  const seedPath = path.join(__dirname, '..', 'data', 'seed-blogs.json');
  if (!fs.existsSync(seedPath)) return;

  const posts = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  for (const post of posts) {
    const created = await strapi.documents(BLOG_UID).create({
      data: toBlogData(post),
    });

    if (created?.documentId) {
      await publishBlogDocument(strapi, created.documentId);
    }
  }

  strapi.log.info(`Seeded ${posts.length} demo blog(s)`);
}

module.exports = {
  // Same as working FXtradehunt project: no custom proxy/cookie middleware.
  register() {},

  async bootstrap({ strapi }) {
    try {
      await configureUploadSettings(strapi);
      await enablePublicBlogPermissions(strapi);
      await configureBlogAdminLayout(strapi);
      await syncFromRecoveredFile(strapi);
      await syncCoverImages(strapi);
      await seedBlogsIfEmpty(strapi);
    } catch (error) {
      strapi.log.warn(`Bootstrap setup skipped: ${error.message}`);
    }
  },
};
