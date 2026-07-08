import * as cheerio from 'cheerio'

export const SITE_DEFAULT = 'https://www.fivetecglobalcapital.com'
export const STOP_HEADINGS = /^disclaimer\b/i
export const FOOTER_HEADINGS = /^professional trading insights/i
export const CATEGORIES = ['Beginner', 'Intermediate', 'Advanced', 'General', 'Education', 'Trading']

export function decodeHtml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

export function parseKeywords(raw) {
  if (!raw) return null
  if (Array.isArray(raw)) return raw.filter(Boolean)
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function toDateOnly(value) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export function toBlogPayload(post) {
  const excerpt = post.excerpt?.trim() || null
  const content = post.content || null
  return {
    title: post.title?.trim() || 'Untitled',
    slug: post.slug,
    category: post.category || 'General',
    excerpt,
    description: post.description?.trim() || excerpt,
    content,
    date: toDateOnly(post.date || post.publishDate || null),
    author: post.author || post.authorName?.trim() || 'FiveTec Editorial Team',
    readTime: post.readTime || Math.max(1, Math.ceil(String(content || '').split(/\s+/).filter(Boolean).length / 200)),
    metaTitle: post.metaTitle?.trim() || post.title?.trim() || 'Untitled',
    metaDescription: post.metaDescription?.trim() || excerpt,
  }
}

export function getCoverUrlFromPost(post, strapiBase = '') {
  const img = post.coverImage || post.image
  if (!img) return post.coverImageUrl || null
  if (typeof img === 'string') return img
  const data = img.data?.attributes || img.data || img.attributes || img
  const url = data?.url || data?.formats?.large?.url || data?.formats?.medium?.url
  if (!url) return post.coverImageUrl || null
  if (url.startsWith('http')) return url
  const base = strapiBase.replace(/\/$/, '')
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export function cloudPostToRecovered(post, strapiBase = '') {
  const seo = post.seo && typeof post.seo === 'object' ? post.seo : null
  let keywords = post.keywords || seo?.keywords || null
  if (typeof keywords === 'string') keywords = parseKeywords(keywords)

  const content =
    typeof post.content === 'string'
      ? post.content
      : post.content?.body || post.content?.markdown || ''

  const excerpt = post.excerpt || post.description || null

  return toBlogPayload({
    title: post.title,
    slug: post.slug || post.documentId,
    category: post.category || 'General',
    excerpt,
    description: post.description || excerpt,
    content,
    publishDate: post.publishDate || post.publishedAt || post.createdAt || null,
    metaTitle: post.metaTitle || seo?.metaTitle || post.title,
    metaDescription: post.metaDescription || seo?.metaDescription || excerpt,
    keywords,
    canonicalUrl: post.canonicalUrl || null,
    authorName: post.author?.name || post.authorName || 'FiveTec Editorial Team',
    coverImageUrl: getCoverUrlFromPost(post, strapiBase),
  })
}

function metaFromHtml(html, key, type = 'name') {
  const re = type === 'property'
    ? new RegExp(`property="${key}" content="([^"]*)"`, 'i')
    : new RegExp(`name="${key}" content="([^"]*)"`, 'i')
  return decodeHtml(re.exec(html)?.[1]?.trim() || '')
}

export function detectCategory($) {
  const badge = $('main span.uppercase').first().text().trim()
  if (CATEGORIES.includes(badge)) return badge

  for (const category of CATEGORIES) {
    const match = $('main span')
      .filter((_, el) => $(el).text().trim() === category)
      .first()
    if (match.length) return category
  }

  return 'General'
}

export function extractMainMarkdown($) {
  const main = $('main').first()
  if (!main.length) return ''

  const lines = []
  let stopped = false
  let started = false

  main.find('h2, h3, p, li, blockquote').each((_, el) => {
    if (stopped) return

    const tag = el.tagName?.toLowerCase()
    const text = decodeHtml($(el).text().replace(/\s+/g, ' ').trim())
    if (!text) return

    if (tag === 'h2') {
      if (STOP_HEADINGS.test(text) || FOOTER_HEADINGS.test(text)) {
        stopped = true
        return
      }
      started = true
      lines.push('', `## ${text}`)
      return
    }

    if (!started) return

    if (/^published on /i.test(text)) return
    if (text.length < 40 && /^(main|trade|company|markets|legal|platforms)$/i.test(text)) return

    if (tag === 'h3') {
      lines.push('', `### ${text}`)
      return
    }

    if (tag === 'li') {
      lines.push(`- ${text}`)
      return
    }

    if (tag === 'blockquote') {
      lines.push('', `> ${text}`)
      return
    }

    lines.push('', text)
  })

  return lines.join('\n').replace(/^\s+/, '').trim()
}

export async function getSlugsFromSitemap(siteUrl) {
  const res = await fetch(`${siteUrl.replace(/\/$/, '')}/sitemap.xml`)
  if (!res.ok) throw new Error(`Sitemap failed (${res.status})`)
  const xml = await res.text()
  const slugs = [...xml.matchAll(/<loc>[^<]*\/blogs\/([a-z0-9-]+)<\/loc>/gi)].map((m) => m[1])
  return [...new Set(slugs)]
}

export async function scrapeBlogFromLive(siteUrl, slug, { retries = 3 } = {}) {
  let lastError = null

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await scrapeBlogPage(siteUrl, slug)
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
      }
    }
  }

  throw lastError
}

async function scrapeBlogPage(siteUrl, slug) {
  const res = await fetch(`${siteUrl.replace(/\/$/, '')}/blogs/${slug}`)
  if (!res.ok) throw new Error(`${slug} failed (${res.status})`)

  const html = await res.text()
  const $ = cheerio.load(html)

  const rawTitle =
    meta(html, 'og:title', 'property')
    || meta(html, 'twitter:title', 'property')
    || $('h1').first().text().trim()
    || slug

  const title = rawTitle.replace(/\s+\|\s+FiveTec.*$/i, '').trim()
  const excerpt = meta(html, 'description')
  const coverImageUrl = meta(html, 'og:image', 'property') || null
  const publishDate =
    meta(html, 'article:published_time', 'property')
    || (html.match(new RegExp(`<loc>[^<]*/blogs/${slug}</loc>[\\s\\S]*?<lastmod>([^<]+)</lastmod>`, 'i'))?.[1] ?? null)
  const canonicalUrl = (html.match(/rel="canonical" href="([^"]*)"/i) || [])[1] || `${siteUrl.replace(/\/$/, '')}/blogs/${slug}`
  const keywords = parseKeywords(meta(html, 'keywords'))
  const category = detectCategory($)
  const content = extractMainMarkdown($)

  return toBlogPayload({
    title,
    slug,
    category,
    excerpt,
    description: excerpt,
    content,
    coverImageUrl,
    publishDate,
    metaTitle: title,
    metaDescription: excerpt,
    keywords,
    canonicalUrl,
    authorName: 'FiveTec Editorial Team',
  })
}

function meta(html, key, type = 'name') {
  return metaFromHtml(html, key, type)
}
