import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const catalog = JSON.parse(readFileSync(new URL('../src/content/index.json', import.meta.url), 'utf8')) as {
  guides: { slug: string }[]
}

const STAMP = '2026-11-01T12:00:00.000Z'
const WIDTHS = [390, 768, 1440]

/** Every medal except Brunch Club, so the new-achievement sheet opens on that one. */
function knownBadges(): Record<string, string> {
  const known: Record<string, string> = {
    'been-1': STAMP, 'been-10': STAMP, 'been-25': STAMP, 'been-50': STAMP, 'been-100': STAMP, 'been-250': STAMP,
    'rated-1': STAMP, 'rated-10': STAMP, 'rated-25': STAMP, 'rated-50': STAMP, 'rated-100': STAMP, 'rated-250': STAMP,
    'hoods-5': STAMP, 'hoods-15': STAMP, 'hoods-30': STAMP,
    'cuisines-5': STAMP, 'cuisines-10': STAMP, 'cuisines-20': STAMP,
    'number-one': STAMP, 'podium': STAMP, 'top10-sweep': STAMP, 'scout': STAMP, 'night-owl': STAMP,
    'city-seattle': STAMP, 'city-eastside': STAMP, 'city-la': STAMP, 'city-bay': STAMP, 'city-sandiego': STAMP,
    'city-vancouver': STAMP, 'city-portland': STAMP, 'city-nyc': STAMP, 'city-pullman': STAMP, 'city-all': STAMP,
    'game-day-regular': STAMP, 'palouse-explorer': STAMP, 'wave-the-flag': STAMP,
    'ultimate-all': STAMP, 'ultimate-wa': STAMP, 'ultimate-ca': STAMP,
  }
  for (const area of ['seattle', 'eastside', 'la', 'bay', 'sandiego', 'vancouver', 'portland', 'nyc', 'pullman']) {
    known[`ultimate-${area}`] = STAMP
  }
  for (const guide of catalog.guides) known[`guide-${guide.slug}`] = STAMP
  delete known['brunch-club']
  return known
}

async function openBrunchClub(page: Page) {
  await page.addInitScript((known) => {
    const user = { id: 'local-sam', name: 'Sam', handle: 'sam', isOwner: false }
    localStorage.setItem('gusto.session.v1', JSON.stringify(user))
    localStorage.setItem('gusto.doc.v1.local-sam', JSON.stringify({
      statuses: { 'cafe-flora': 'been', 'cafe-campagne': 'been', 'biscuit-bitch': 'been' },
      guides: [], following: [], activities: [], likes: [], comments: [], plans: [], notices: [],
      order: { loved: [], liked: [], fine: [], didnt: [] },
      scores: {},
    }))
    localStorage.setItem('gg_achievements_local-sam', JSON.stringify(known))
  }, knownBadges())
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/u/sam')
  await expect(page.getByRole('dialog', { name: 'Brunch Club' })).toBeVisible()
  await expect(page.getByText('New achievement')).toBeVisible()
}

async function doneOffset(page: Page) {
  return page.evaluate(() => {
    const sheet = document.querySelector('[role="dialog"]')?.getBoundingClientRect()
    const button = [...document.querySelectorAll('button')].find((el) => el.textContent?.trim() === 'Done')?.getBoundingClientRect()
    if (!sheet || !button) return null
    return {
      delta: (button.x + button.width / 2) - (sheet.x + sheet.width / 2),
      buttonWidth: button.width,
      sheetWidth: sheet.width,
    }
  })
}

test('Done stays centered on a milestone sheet and beside Open the guide on a guide sheet', async ({ page }) => {
  await openBrunchClub(page)
  const dialog = page.getByRole('dialog', { name: 'Brunch Club' })
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    const offset = await doneOffset(page)
    expect(offset, `measurement at ${width}px`).not.toBeNull()
    expect(Math.abs(offset!.delta), `Done center vs sheet center at ${width}px`).toBeLessThanOrEqual(1)
    expect(offset!.buttonWidth, `Done stays a pill at ${width}px`).toBeLessThan(offset!.sheetWidth / 2)
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()
  await page.locator('.ach-city .ach-tile').first().click()
  const openGuide = page.getByRole('link', { name: 'Open the guide' })
  const done = page.getByRole('button', { name: 'Done' })
  await expect(openGuide).toBeVisible()
  await expect(done).toBeVisible()
  const openBox = await openGuide.boundingBox()
  const doneBox = await done.boundingBox()
  expect(openBox).not.toBeNull()
  expect(doneBox).not.toBeNull()
  expect(Math.abs(openBox!.y - doneBox!.y)).toBeLessThan(4)
  expect(openBox!.x + openBox!.width).toBeLessThanOrEqual(doneBox!.x)
})
