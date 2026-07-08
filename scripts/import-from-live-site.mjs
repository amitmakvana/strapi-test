/**
 * Recover blogs from live production site.
 * Saves every schema field: title, slug, category, excerpt, description, content,
 * coverImageUrl, publishDate, metaTitle, metaDescription, keywords, canonicalUrl, authorName.
 *
 * Usage:
 *   node scripts/import-from-live-site.mjs              # scrape + save JSON
 *   node scripts/import-from-live-site.mjs --import     # scrape + create missing in local Strapi
 *   node scripts/import-from-live-site.mjs --sync        # scrape + create/update all in local Strapi
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SITE_DEFAULT,
  getSlugsFromSitemap,
  scrapeBlogFromLive,
  toBlogPayload,
} from './blog-recovery-utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SITE = (process.env.LIVE_SITE_URL || SITE_DEFAULT).replace(/\/$/, '')
const LOCAL = (process.env.STRAPI_LOCAL_URL || 'http://localhost:1337').replace(/\/$/, '')
const LOCAL_TOKEN = process.env.STRAPI_LOCAL_TOKEN || ''
const OUT = path.join(__dirname, '..', 'data', 'recovered-blogs.json')

async function fetchLocalPosts() {
  const res = await fetch(`${LOCAL}/api/blogs?pagination[pageSize]=250&status=published`, {
    headers: LOCAL_TOKEN ? { Authorization: `Bearer ${LOCAL_TOKEN}` } : {},
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data || []
}

async function createLocalPost(post) {
  const res = await fetch(`${LOCAL}/api/blogs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOCAL_TOKEN}`,
    },
    body: JSON.stringify({ data: toBlogPayload(post) }),
  })
  if (!res.ok) throw new Error((await res.text()).slice(0, 200))
  return res.json()
}

async function updateLocalPost(documentId, post) {
  const res = await fetch(`${LOCAL}/api/blogs/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOCAL_TOKEN}`,
    },
    body: JSON.stringify({ data: toBlogPayload(post) }),
  })
  if (!res.ok) throw new Error((await res.text()).slice(0, 200))
  return res.json()
}

async function publishLocalPost(documentId) {
  await fetch(`${LOCAL}/api/blogs/${documentId}/actions/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOCAL_TOKEN}` },
  }).catch(() => {})
}

async function syncToLocal(posts, { updateExisting = false } = {}) {
  if (!LOCAL_TOKEN) {
    console.log('\n⚠ STRAPI_LOCAL_TOKEN not set — saved JSON only.')
    console.log('  Create token at http://localhost:1337/admin → Settings → API Tokens')
    console.log('  Then run: node scripts/import-from-live-site.mjs --sync')
    console.log('  Or restart Strapi — bootstrap syncs recovered-blogs.json automatically.')
    return
  }

  const localPosts = await fetchLocalPosts()
  const bySlug = new Map(localPosts.map((post) => [post.slug, post]))

  let created = 0
  let updated = 0

  for (const post of posts) {
    const existing = bySlug.get(post.slug)
    try {
      if (existing) {
        if (!updateExisting) {
          console.log(`skip  ${post.slug}`)
          continue
        }
        const documentId = existing.documentId || existing.id
        await updateLocalPost(documentId, post)
        await publishLocalPost(documentId)
        console.log(`↻     ${post.slug}`)
        updated += 1
        continue
      }

      const createdPost = await createLocalPost(post)
      const documentId = createdPost?.data?.documentId || createdPost?.data?.id
      if (documentId) await publishLocalPost(documentId)
      console.log(`✓     ${post.slug}`)
      created += 1
    } catch (error) {
      console.log(`✗     ${post.slug}: ${error.message}`)
    }
  }

  console.log(`\nCreated ${created}, updated ${updated} → http://localhost:1337/admin`)
}

async function main() {
  const doImport = process.argv.includes('--import')
  const doSync = process.argv.includes('--sync')

  console.log(`Scraping blogs from ${SITE}…`)
  const slugs = await getSlugsFromSitemap(SITE)
  console.log(`Found ${slugs.length} blog slugs in sitemap\n`)

  const posts = []
  const failed = []

  for (const slug of slugs) {
    try {
      const post = await scrapeBlogFromLive(SITE, slug)
      posts.push(post)
      console.log(`scraped ${slug}`)
    } catch (error) {
      failed.push(slug)
      console.warn(`failed ${slug}: ${error.message}`)
    }
  }

  let merged = posts
  if (fs.existsSync(OUT)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUT, 'utf8'))
      if (Array.isArray(existing) && existing.length > 0) {
        const bySlug = new Map(existing.map((post) => [post.slug, post]))
        for (const post of posts) bySlug.set(post.slug, post)
        merged = [...bySlug.values()].sort((a, b) => {
          const aDate = new Date(a.publishDate || 0).getTime()
          const bDate = new Date(b.publishDate || 0).getTime()
          return bDate - aDate
        })
        if (failed.length > 0) {
          console.log(`\nKept ${failed.length} previously saved post(s) that failed this run: ${failed.join(', ')}`)
        }
      }
    } catch {
      // ignore invalid existing file
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(merged, null, 2))
  console.log(`\nSaved ${merged.length} posts → ${OUT}`)

  if (doSync) await syncToLocal(merged, { updateExisting: true })
  else if (doImport) await syncToLocal(merged, { updateExisting: false })
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
