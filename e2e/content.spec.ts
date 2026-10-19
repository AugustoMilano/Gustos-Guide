import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import {
  assertCopy,
  repeatedGrams,
  repeatedTemplate,
  shortSentence,
  slashListHit,
  streetNumberHit,
  truncatedNameHit,
  TRY_FILLER,
} from '../scripts/lint-copy.mjs'

const places = JSON.parse(readFileSync(new URL('../src/content/places.json', import.meta.url), 'utf8')) as Record<
  string,
  { id: string; name: string; address: string; muid: string; oneLiner: string; blurb: string; copySource: string }
>
const guides = JSON.parse(readFileSync(new URL('../src/content/guides.json', import.meta.url), 'utf8')) as {
  slug: string
  entries: { placeId: string; pullQuote: string; blurb: string }[]
}[]
const source = JSON.parse(readFileSync(new URL('../data/places_categorized.json', import.meta.url), 'utf8')) as {
  muid: string
  name: string
}[]
const house = JSON.parse(readFileSync(new URL('../data/house-copy.json', import.meta.url), 'utf8')) as Record<
  string,
  { pullQuote: string; blurb: string; guideQuotes?: Record<string, string> }
>

test('catalog copy is house voice, not filler or a fake review', ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Content lint runs once')
  const diveBlurbs = new Set(guides.find((guide) => guide.slug === 'fun-dive-bars')?.entries.map((entry) => entry.blurb) ?? [])
  const lines = [
    ...Object.values(places).map((place) => ({ text: place.oneLiner, placeId: place.id })),
    ...guides.flatMap((guide) => guide.entries.map((entry) => ({ text: entry.pullQuote, placeId: entry.placeId }))),
  ]
  const blurbs = [
    ...Object.values(places).map((place) => ({ text: place.blurb, placeId: place.id, name: place.name, exempt: diveBlurbs.has(place.blurb) })),
    ...guides.flatMap((guide) =>
      guide.entries.map((entry) => ({
        text: entry.blurb,
        placeId: entry.placeId,
        name: places[entry.placeId]?.name,
        exempt: guide.slug === 'fun-dive-bars' || diveBlurbs.has(entry.blurb),
      })),
    ),
  ]
  const catalog = [...lines.map((item) => item.text), ...blurbs.map((item) => item.text)].join('\n')

  expect(catalog.includes('Try tofu')).toBe(false)
  expect(catalog.match(/\bTry\s+[a-z]+,\s+[a-z]+\s+[a-z]+/gi)).toBeNull()
  expect(JSON.stringify(places).includes('"review"')).toBe(false)
  expect(() => assertCopy({ lines, blurbs })).not.toThrow()

  const names = new Map(source.filter((place) => place?.muid && place.name).map((place) => [String(place.muid), place.name]))
  for (const place of Object.values(places)) {
    expect(place.name).toBe(names.get(place.muid))
    expect(place.copySource).toBe('draft')
    for (const text of [place.oneLiner, place.blurb]) {
      expect(truncatedNameHit(place.name, place.address, text)).toBe(false)
    }
  }
  const umi = Object.values(places).find((place) => place.name === 'Umi Sake House')
  expect(umi?.name).toBe('Umi Sake House')
  expect(truncatedNameHit('Umi Sake House', '2230 1st Ave, Seattle, WA', 'Sushi restaurant Umi 2230 1st Ave')).toBe(true)
  expect(truncatedNameHit(umi!.name, umi!.address, umi!.blurb)).toBe(false)
  expect(umi!.oneLiner.includes('Umi 2230')).toBe(false)

  for (const guide of guides) {
    for (const entry of guide.entries) {
      const place = places[entry.placeId]
      if (guide.slug === 'fun-dive-bars') continue
      expect(entry.blurb).toBe(place.blurb)
      const override = house[place.id]?.guideQuotes?.[guide.slug]
      expect(entry.pullQuote).toBe(override || place.oneLiner)
    }
  }

  expect(TRY_FILLER.test('Try tofu, smoky broth at Umi Sake House. Then tofu, tangy broth.')).toBe(true)
  expect(TRY_FILLER.test('Try the pork shoulder.')).toBe(false)
  expect(repeatedTemplate('Try tofu, peppery bun. Try tofu, malty bun. Try tofu, yeasty bun.')).toBeTruthy()
  expect(repeatedTemplate('Umi Sake House pours sake late. The bamboo room suits a group.')).toBeNull()
  expect(shortSentence('Slushies rotate.')).toBe('Slushies rotate')
  expect(shortSentence('A Belltown sushi bar with a long sake list.')).toBeNull()
  expect(streetNumberHit('Meet at 2230 1st Ave after work.')).toBeTruthy()
  expect(streetNumberHit('The doors have been open since 1929.')).toBeNull()
  expect(streetNumberHit('Save 2120 for a big night out in the Denny Triangle.', '2120')).toBeNull()
  expect(streetNumberHit('Meet at 2120 6th Ave tonight.', '2120')).toBeTruthy()
  expect(shortSentence('Getting a pie from A.K. Pizza takes real effort.')).toBeNull()
  expect(slashListHit('Umi 2230 1st Ave / Umi 2230 in Belltown / Umi 2230 for Sushi')).toBe(true)
  expect(slashListHit('A Belltown sushi bar with a long sake list.')).toBe(false)
  const grams = repeatedGrams(
    ['alpha beta gamma delta epsilon', 'alpha beta gamma delta zeta', 'alpha beta gamma delta eta'],
    4,
    2,
  )
  expect(grams.some((hit) => hit.gram === 'alpha beta gamma delta' && hit.count === 3)).toBe(true)
  expect(() =>
    assertCopy({
      lines: [
        { text: 'Same pull quote reused across two guides tonight.', placeId: 'a' },
        { text: 'Same pull quote reused across two guides tonight.', placeId: 'a' },
      ],
      blurbs: [{ text: 'One honest sentence about the room and the crowd.', placeId: 'a' }],
    }),
  ).not.toThrow()
  expect(() =>
    assertCopy({
      lines: [
        { text: 'Same pull quote reused across two guides tonight.', placeId: 'a' },
        { text: 'Same pull quote reused across two guides tonight.', placeId: 'b' },
      ],
      blurbs: [{ text: 'One honest sentence about the room and the crowd.', placeId: 'a' }],
    }),
  ).toThrow(/Duplicate line/)
  expect(() =>
    assertCopy({
      lines: [{ text: 'A pull quote long enough to clear the floor.', placeId: 'a' }],
      blurbs: [{ text: 'Too short here. Then a real sentence about the dining room follows it.', placeId: 'a' }],
    }),
  ).toThrow(/under 4 words/)
})
