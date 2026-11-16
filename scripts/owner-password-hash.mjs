#!/usr/bin/env node
// Makes the OWNER_PASSWORD_HASH value for the owner sign-in Function.
// Run it yourself; the password is read from the terminal without echo and is
// never written anywhere. Paste only the printed hash into the Cloudflare
// Pages secret (wrangler pages secret put OWNER_PASSWORD_HASH --project-name gustos-guide).
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { stdin, stdout } from 'node:process'

const ITERATIONS = 100000

export function makeHash(password, salt = randomBytes(16), iterations = ITERATIONS) {
  const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256')
  return `pbkdf2-sha256$${iterations}$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

function ask(prompt) {
  return new Promise((resolve) => {
    stdout.write(prompt)
    let value = ''
    const tty = stdin.isTTY
    if (tty) stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          if (tty) stdin.setRawMode(false)
          stdin.pause()
          stdin.off('data', onData)
          stdout.write('\n')
          resolve(value)
          return
        }
        if (ch === '\u0003') process.exit(130)
        if (ch === '\u007f') value = value.slice(0, -1)
        else value += ch
      }
    }
    stdin.on('data', onData)
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const first = await ask('Owner password (12+ characters): ')
  if (first.length < 12) {
    console.error('Use at least 12 characters.')
    process.exit(1)
  }
  const second = await ask('Again: ')
  if (first !== second) {
    console.error('The two entries differ.')
    process.exit(1)
  }
  console.log(makeHash(first))
}
