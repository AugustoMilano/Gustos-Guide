import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveBuildSha, stampIndexBoot } from './stamp-sw.mjs'

const script = fileURLToPath(new URL('./stamp-sw.mjs', import.meta.url))
const good = 'fd775867464f41674c24ee70cbfbdac81aeab1dc'
const other = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
let failed = 0

function check(name, fn) {
  try {
    fn()
    console.log(`ok ${name}`)
  } catch (error) {
    failed += 1
    console.error(`FAIL ${name}`)
    console.error(error)
  }
}

check('env sha wins and git is not called', () => {
  let called = false
  const sha = resolveBuildSha({ GUSTO_BUILD_SHA: good.toUpperCase() }, () => {
    called = true
    return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  })
  assert.equal(sha, good)
  assert.equal(called, false)
})

check('short, word, and non-hex values are rejected', () => {
  for (const value of ['fd77586', 'HEAD', 'not-a-sha', `${good}0`, `${good.slice(0, 39)}g`]) {
    assert.throws(() => resolveBuildSha({ GUSTO_BUILD_SHA: value }, () => {
      throw new Error('git should not run')
    }), /40-character/)
  }
})

check('blank env falls back to git', () => {
  const sha = resolveBuildSha({ GUSTO_BUILD_SHA: '   \n' }, () => `${other}\n`)
  assert.equal(sha, other)
})

check('git output must be a full sha', () => {
  assert.throws(() => resolveBuildSha({}, () => 'HEAD\n'), /not a 40-character/)
})

check('missing git tells the builder to set the env', () => {
  assert.throws(
    () => resolveBuildSha({}, () => {
      throw new Error('fatal: not a git repository')
    }),
    /Set GUSTO_BUILD_SHA/,
  )
})

function runStamp(cwd, env) {
  const childEnv = { ...process.env, ...env }
  if (!Object.prototype.hasOwnProperty.call(env, 'GUSTO_BUILD_SHA')) delete childEnv.GUSTO_BUILD_SHA
  return spawnSync(process.execPath, [script], { cwd, env: childEnv, encoding: 'utf8' })
}

function freshDir() {
  const dir = mkdtempSync(join(tmpdir(), 'gusto-stamp-'))
  mkdirSync(join(dir, 'dist'))
  writeFileSync(join(dir, 'dist/sw.js'), "const CACHE = 'gusto-__GUSTO_BUILD__'\n")
  return dir
}

check('a directory with no git stamps from GUSTO_BUILD_SHA', () => {
  const dir = freshDir()
  try {
    const result = runStamp(dir, { GUSTO_BUILD_SHA: good })
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    const text = readFileSync(join(dir, 'dist/sw.js'), 'utf8')
    assert.equal(text, `const CACHE = 'gusto-${good}'\n`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

check('no git and no env leaves the placeholder and exits', () => {
  const dir = freshDir()
  try {
    const result = runStamp(dir, {})
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /GUSTO_BUILD_SHA/)
    assert.equal(readFileSync(join(dir, 'dist/sw.js'), 'utf8').includes('__GUSTO_BUILD__'), true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

check('an invalid env does not stamp', () => {
  const dir = freshDir()
  try {
    const result = runStamp(dir, { GUSTO_BUILD_SHA: 'HEAD' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /40-character/)
    assert.equal(readFileSync(join(dir, 'dist/sw.js'), 'utf8').includes('__GUSTO_BUILD__'), true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

check('index.html boots status.js with the commit', () => {
  const html = '<script src="./status.js"></script>'
  const stamped = stampIndexBoot(html, good)
  assert.equal(stamped, `<script src="./status.js?v=${good}"></script>`)
  assert.equal(stampIndexBoot(stamped, other), `<script src="./status.js?v=${other}"></script>`)
  assert.equal(stampIndexBoot('<script src="/status.js"></script>', good), `<script src="/status.js?v=${good}"></script>`)
  assert.throws(() => stampIndexBoot('<script src="./app.js"></script>', good), /status\.js/)
})

if (failed) {
  console.error(`${failed} stamp-sw test(s) failed`)
  process.exit(1)
}
console.log('stamp-sw tests passed')
