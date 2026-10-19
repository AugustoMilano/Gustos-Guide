import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { assertCopy, repeatedGrams, repeatedTemplate, TRY_FILLER } from '../scripts/lint-copy.mjs'

const places = JSON.parse(readFileSync(new URL('../src/content/places.json', import.meta.url), 'utf8')) as Record<string, { oneLiner: string; review: string }>
const guides = JSON.parse(readFileSync(new URL('../src/content/guides.json', import.meta.url), 'utf8')) as {
  slug: string
  entries: { pullQuote: string; blurb: string }[]
}[]

test('catalog copy has no padded filler', ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Content lint runs once')
  const lines = [
    ...Object.values(places).map((place) => place.oneLiner),
    ...guides.flatMap((guide) => guide.entries.map((entry) => entry.pullQuote)),
  ]
  const blurbs = guides.flatMap((guide) => guide.entries.map((entry) => entry.blurb))
  const prose = Object.values(places).map((place) => place.review)
  const catalog = [...lines, ...blurbs, ...prose].join('\n')

  expect(catalog.includes('Try tofu')).toBe(false)
  expect(catalog.match(/\bTry\s+[a-z]+,\s+[a-z]+\s+[a-z]+/gi)).toBeNull()
  expect(() => assertCopy({ lines, blurbs, prose })).not.toThrow()

  expect(TRY_FILLER.test('Try tofu, smoky broth at Umi Sake House. Then tofu, tangy broth.')).toBe(true)
  expect(TRY_FILLER.test('Try the pork shoulder.')).toBe(false)
  expect(repeatedTemplate('Try tofu, peppery bun. Try tofu, malty bun. Try tofu, yeasty bun.')).toBeTruthy()
  expect(repeatedTemplate('Umi 2230 for sushi. Late dining in Belltown.')).toBeNull()
  const grams = repeatedGrams(
    ['alpha beta gamma delta epsilon', 'alpha beta gamma delta zeta', 'alpha beta gamma delta eta'],
    4,
    2,
  )
  expect(grams.some((hit) => hit.gram === 'alpha beta gamma delta' && hit.count === 3)).toBe(true)
})
