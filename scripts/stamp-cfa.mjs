// Put the Cloudflare Web Analytics site token into dist/cfa.js at build time, from
// CF_WEB_ANALYTICS_TOKEN (the bare token or the whole snippet). The token stays out of source.
// Never logs the token.
import { readFileSync, writeFileSync } from 'node:fs'

const raw = process.env.CF_WEB_ANALYTICS_TOKEN || ''
const token = (raw.match(/(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])/) || [])[0] || ''
const file = 'dist/cfa.js'
const text = readFileSync(file, 'utf8')
if (!token) {
  console.log('cfa: no analytics token in the environment; beacon stays off')
} else {
  const next = text.replace("var TOKEN = '';", `var TOKEN = '${token}';`)
  if (next === text) throw new Error('cfa: TOKEN placeholder not found in dist/cfa.js')
  writeFileSync(file, next)
  console.log('cfa: analytics token stamped')
}
