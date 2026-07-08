/**
 * Download coverImageUrl for each blog and attach to coverImage media field.
 * Requires Strapi running with STRAPI_LOCAL_TOKEN in strapi/.env
 *
 * Usage: node scripts/import-cover-images.mjs
 * (Or restart Strapi — bootstrap runs this automatically.)
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RECOVERED = path.join(__dirname, '..', 'data', 'recovered-blogs.json')

const LOCAL = (process.env.STRAPI_LOCAL_URL || 'http://localhost:1337').replace(/\/$/, '')
const LOCAL_TOKEN = process.env.STRAPI_LOCAL_TOKEN || ''

async function main() {
  if (!LOCAL_TOKEN) {
    console.log('No STRAPI_LOCAL_TOKEN — restart Strapi instead (bootstrap imports covers automatically).')
    process.exit(0)
  }

  const recovered = JSON.parse(fs.readFileSync(RECOVERED, 'utf8'))
  const coverBySlug = new Map(recovered.map((post) => [post.slug, post.coverImageUrl]))

  const headers = { Authorization: `Bearer ${LOCAL_TOKEN}` }
  const listRes = await fetch(`${LOCAL}/api/blogs?pagination[pageSize]=250&populate=image`, { headers })
  if (!listRes.ok) throw new Error(`Strapi unavailable (${listRes.status})`)

  const posts = (await listRes.json()).data || []
  let attached = 0

  for (const post of posts) {
    const coverImageUrl = coverBySlug.get(post.slug)
    if (post.image || !coverImageUrl) {
      console.log(`skip  ${post.slug}`)
      continue
    }

    const imageRes = await fetch(coverImageUrl)
    if (!imageRes.ok) {
      console.log(`✗     ${post.slug}: download failed (${imageRes.status})`)
      continue
    }

    const buffer = Buffer.from(await imageRes.arrayBuffer())
    const filename = coverImageUrl.split('/').pop() || `${post.slug}.jpg`
    const blob = new Blob([buffer], { type: imageRes.headers.get('content-type') || 'image/jpeg' })
    const form = new FormData()
    form.append('files', blob, filename)
    form.append('fileInfo', JSON.stringify({ name: filename, alternativeText: post.title }))

    const uploadRes = await fetch(`${LOCAL}/api/upload`, {
      method: 'POST',
      headers,
      body: form,
    })

    if (!uploadRes.ok) {
      console.log(`✗     ${post.slug}: upload failed (${(await uploadRes.text()).slice(0, 100)})`)
      continue
    }

    const uploaded = await uploadRes.json()
    const fileId = uploaded?.[0]?.id
    if (!fileId) {
      console.log(`✗     ${post.slug}: no file id returned`)
      continue
    }

    const documentId = post.documentId || post.id
    const updateRes = await fetch(`${LOCAL}/api/blogs/${documentId}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { image: fileId, metaImage: fileId } }),
    })

    if (!updateRes.ok) {
      console.log(`✗     ${post.slug}: link failed`)
      continue
    }

    await fetch(`${LOCAL}/api/blogs/${documentId}/actions/publish`, {
      method: 'POST',
      headers,
    }).catch(() => {})

    console.log(`✓     ${post.slug}`)
    attached += 1
  }

  console.log(`\nAttached ${attached} cover image(s). Refresh admin → Blog → edit entry.`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
