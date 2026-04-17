import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE_URL = (process.env.VITE_SITE_URL || 'https://novel.waitli.top').replace(/\/+$/, '')
const outputPath = join(fileURLToPath(new URL('../public/sitemap.xml', import.meta.url)))

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`

await writeFile(outputPath, xml, 'utf8')
console.log(`[sitemap] wrote ${outputPath}`)
