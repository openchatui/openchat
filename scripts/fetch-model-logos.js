#!/usr/bin/env node
// Download unique model logo URLs from public/model-logos.json
// and generate a local mapping at public/model-logos-local.json

const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

function hashUrl(url) {
  return crypto.createHash('md5').update(url).digest('hex').slice(0, 10)
}

function inferExt(url) {
  try {
    const u = new URL(url)
    const pathname = u.pathname || ''
    const lastSeg = pathname.split('/').pop() || ''
    const hasPngQuery = /[?&]format=png(&|$)/i.test(u.search)
    if (/\.svg$/i.test(lastSeg)) return '.svg'
    if (/\.png$/i.test(lastSeg) || hasPngQuery) return '.png'
    if (/\.jpg$/i.test(lastSeg) || /\.jpeg$/i.test(lastSeg)) return '.jpg'
    return '.png'
  } catch {
    return '.png'
  }
}

function buildFileName(url) {
  const u = new URL(url)
  const host = (u.hostname || 'logo').replace(/[^a-z0-9.-]/gi, '_')
  const h = hashUrl(url)
  const ext = inferExt(url)
  return `${host}_${h}${ext}`
}

async function fetchWithTimeout(url, { timeoutMs = 15000 } = {}) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ac.signal })
    return res
  } finally {
    clearTimeout(t)
  }
}

async function download(url, outPath, { timeoutMs = 15000, maxRetries = 3 } = {}) {
  let lastErr
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { timeoutMs })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const buf = Buffer.from(await res.arrayBuffer())
      await fs.writeFile(outPath, buf)
      return
    } catch (e) {
      lastErr = e
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * attempt))
        continue
      }
    }
  }
  throw new Error(`Failed to download ${url}: ${lastErr?.message || 'unknown error'}`)
}

async function main() {
  const repoRoot = process.cwd()
  const logosJsonPath = path.join(repoRoot, 'public', 'model-logos.json')
  const logosDir = path.join(repoRoot, 'public', 'logos')
  const localMapPath = path.join(repoRoot, 'public', 'model-logos-local.json')

  const txt = await fs.readFile(logosJsonPath, 'utf-8')
  const mapping = JSON.parse(txt)

  await ensureDir(logosDir)

  // Build URL set and key->url mapping
  const entries = Object.entries(mapping)
  const keyToUrl = new Map()
  const uniqueUrls = new Map() // url -> filename

  for (const [key, value] of entries) {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      keyToUrl.set(key, value)
      if (!uniqueUrls.has(value)) {
        uniqueUrls.set(value, buildFileName(value))
      }
    }
  }

  // Download each unique URL once
  const succeeded = new Set()
  let downloaded = 0
  for (const [url, fileName] of uniqueUrls) {
    const outPath = path.join(logosDir, fileName)
    try {
      // Skip if already exists
      let exists = true
      await fs.access(outPath).catch(() => { exists = false })
      if (!exists) {
        await download(url, outPath, { timeoutMs: 15000, maxRetries: 3 })
      }
      succeeded.add(url)
      downloaded++
    } catch (e) {
      console.warn(`Warn: ${e.message}`)
    }
  }

  // Build local mapping: key -> /logos/<filename> or null
  const localMap = {}
  for (const [key, value] of Object.entries(mapping)) {
    if (typeof value === 'string' && succeeded.has(value)) {
      localMap[key] = `/logos/${uniqueUrls.get(value)}`
    } else {
      localMap[key] = null
    }
  }

  await fs.writeFile(localMapPath, JSON.stringify(localMap, null, 2))
  console.log(`Downloaded ${downloaded} unique logos. Wrote mapping to ${path.relative(repoRoot, localMapPath)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


