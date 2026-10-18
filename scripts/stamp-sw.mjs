import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const file = 'dist/sw.js'
const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
const source = readFileSync(file, 'utf8')
if (!source.includes('__GUSTO_BUILD__')) {
  console.error('dist/sw.js is missing __GUSTO_BUILD__')
  process.exit(1)
}
writeFileSync(file, source.replaceAll('__GUSTO_BUILD__', sha))
console.log(`stamped sw.js ${sha}`)
