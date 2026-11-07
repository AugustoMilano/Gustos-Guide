// Stamp dist/sw.js with the commit that was built.
// A git checkout uses `git rev-parse HEAD`. A source archive has no .git directory:
// set GUSTO_BUILD_SHA to the full 40-character commit SHA before `npm run build`.
// When GUSTO_BUILD_SHA is set it wins, and git is not called. The script never invents a SHA.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const SHA_RE = /^[0-9a-f]{40}$/

export function resolveBuildSha(env = process.env, readGit = readGitHead) {
  const provided = env.GUSTO_BUILD_SHA
  if (provided != null && String(provided).trim() !== '') {
    const sha = String(provided).trim().toLowerCase()
    if (!SHA_RE.test(sha)) {
      throw new Error('GUSTO_BUILD_SHA must be the full 40-character hex commit SHA')
    }
    return sha
  }
  try {
    const sha = String(readGit()).trim().toLowerCase()
    if (!SHA_RE.test(sha)) {
      throw new Error(`git rev-parse HEAD returned ${JSON.stringify(sha)}, which is not a 40-character hex SHA`)
    }
    return sha
  } catch (error) {
    if (error instanceof Error && error.message.includes('not a 40-character hex SHA')) throw error
    const reason = error instanceof Error ? error.message.split('\n')[0] : 'git failed'
    throw new Error(
      `No GUSTO_BUILD_SHA and git rev-parse HEAD failed (${reason}). Set GUSTO_BUILD_SHA to the 40-character commit SHA when building a source archive with no .git directory.`,
    )
  }
}

function readGitHead() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })
}

export function stampIndexBoot(html, sha) {
  if (!SHA_RE.test(sha)) throw new Error('boot stamp requires the full 40-character hex commit SHA')
  const next = html.replace(/src="(\.\/|\/)status\.js(?:\?[^"]*)?"/, `src="$1status.js?v=${sha}"`)
  if (next === html) throw new Error('index.html is missing the status.js script')
  return next
}

export function stampServiceWorker(file = 'dist/sw.js', sha = resolveBuildSha()) {
  const source = readFileSync(file, 'utf8')
  if (!source.includes('__GUSTO_BUILD__')) {
    throw new Error(`${file} is missing __GUSTO_BUILD__`)
  }
  writeFileSync(file, source.replaceAll('__GUSTO_BUILD__', sha))
  return sha
}

function isDirectRun() {
  const entry = process.argv[1]
  if (!entry) return false
  return import.meta.url === pathToFileURL(resolve(entry)).href
}

if (isDirectRun()) {
  try {
    const sha = stampServiceWorker()
    const indexPath = resolve('dist/index.html')
    if (existsSync(indexPath)) writeFileSync(indexPath, stampIndexBoot(readFileSync(indexPath, 'utf8'), sha))
    console.log(`stamped sw.js ${sha}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
