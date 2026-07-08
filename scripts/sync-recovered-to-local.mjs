/**
 * Sync recovered-blogs.json into a running Strapi instance via REST API.
 * Requires STRAPI_LOCAL_TOKEN in strapi/.env
 *
 * Usage: node scripts/sync-recovered-to-local.mjs
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { toBlogPayload } from './blog-recovery-utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCAL = (process.env.STRAPI_LOCAL_URL || 'http://localhost:1337').replace(/\/$/, '')
const LOCAL_TOKEN = process.env.STRAPI_LOCAL_TOKEN || ''
const RECOVERED = path.join(__dirname, '..', 'data', 'recovered-blogs.json')

async function main() {
  if (!LOCAL_TOKEN) {
    throw new Error('Set STRAPI_LOCAL_TOKEN in strapi/.env (Settings → API Tokens → Full access)')
  }

  const posts = JSON.parse(fs.readFileSync(RECOVERED, 'utf8'))
  const res = await fetch(`${LOCAL}/api/blogs?pagination[pageSize]=250`, {
    headers: { Authorization: `Bearer ${LOCAL_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Local Strapi unavailable (${res.status})`)

  const localJson = await res.json()
  const bySlug = new Map((localJson.data || []).map((post) => [post.slug, post]))

  let created = 0
  let updated = 0

  for (const post of posts) {
    const payload = { data: toBlogPayload(post) }
    const existing = bySlug.get(post.slug)

    if (existing) {
      const documentId = existing.documentId || existing.id
      const updateRes = await fetch(`${LOCAL}/api/blogs/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LOCAL_TOKEN}`,
        },
        body: JSON.stringify(payload),
      })
      if (!updateRes.ok) {
        console.log(`✗ ${post.slug}: ${(await updateRes.text()).slice(0, 120)}`)
        continue
      }
      await fetch(`${LOCAL}/api/blogs/${documentId}/actions/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOCAL_TOKEN}` },
      }).catch(() => {})
      console.log(`↻ ${post.slug}`)
      updated += 1
      continue
    }

    const createRes = await fetch(`${LOCAL}/api/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOCAL_TOKEN}`,
      },
      body: JSON.stringify(payload),
    })
    if (!createRes.ok) {
      console.log(`✗ ${post.slug}: ${(await createRes.text()).slice(0, 120)}`)
      continue
    }
    const createdPost = await createRes.json()
    const documentId = createdPost?.data?.documentId || createdPost?.data?.id
    if (documentId) {
      await fetch(`${LOCAL}/api/blogs/${documentId}/actions/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOCAL_TOKEN}` },
      }).catch(() => {})
    }
    console.log(`✓ ${post.slug}`)
    created += 1
  }

  console.log(`\nSynced ${posts.length} recovered posts (${created} created, ${updated} updated)`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
