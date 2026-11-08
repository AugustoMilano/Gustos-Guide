import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const guides = JSON.parse(readFileSync(new URL('../src/content/guides.json', import.meta.url), 'utf8')) as {
  slug: string
  entries: { placeId: string }[]
}[]

const market = guides.find((guide) => guide.slug === 'pike-place-market')
const scores = Object.fromEntries((market?.entries ?? []).map((entry) => [entry.placeId, 8]))

async function rankFacts(page: import('@playwright/test').Page) {
  return page.locator('.rank-slot').evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    const line = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2
    const link = node.parentElement?.querySelector('a')
    return {
      text: (node.textContent || '').trim(),
      nowrap: style.whiteSpace,
      wraps: rect.height > line * 1.6,
      overflow: node.scrollWidth > node.clientWidth + 1,
      nameOffset: link && node.parentElement ? Math.round(link.getBoundingClientRect().x - node.parentElement.getBoundingClientRect().x) : null,
    }
  }))
}

test('featured bakeries, South Lake Union name, mismatched photos, and rank numbers', async ({ page }, info) => {
  test.setTimeout(150_000)
  const widths = info.project.name === 'webkit' ? [320, 390, 1440] : [320, 390, 1440]
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.addInitScript((payload) => {
    localStorage.setItem('gusto.house.v1', JSON.stringify(payload))
  }, scores)

  await page.setViewportSize({ width: info.project.name === 'chromium' ? 1440 : 390, height: info.project.name === 'chromium' ? 900 : 844 })
  await page.goto('/#/seattle')
  const featured = page.getByRole('region', { name: 'Featured guides' })
  await expect(featured.getByRole('link')).toHaveCount(6)
  await page.screenshot({ path: `/opt/cursor/artifacts/home-featured-${info.project.name}.png`, fullPage: false })
  await page.goto('/#/seattle/guide/best-bakeries')
  await expect(page).toHaveURL(/\/seattle\/guide\/best-bakeries$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Best Bakeries & Pastry' })).toBeVisible()

  await page.goto('/#/seattle/guides')
  await expect(page.getByRole('link', { name: 'South Lake Union (incl. Denny Triangle)' })).toHaveCount(0)
  const slu = page.getByRole('link', { name: /South Lake Union/ }).first()
  await expect(slu).toContainText('24 places')
  await expect(slu).toHaveAttribute('href', /\/seattle\/guide\/south-lake-union-incl-denny-triangle$/)
  await page.goto('/#/seattle/guide/south-lake-union-incl-denny-triangle')
  await expect(page.getByRole('heading', { level: 1, name: 'South Lake Union' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: /Denny Triangle/ })).toHaveCount(0)
  await expect(page.locator('#entry-2120')).toBeVisible()
  await expect(page).toHaveTitle(/South Lake Union · Gusto's Guide/)
  await page.screenshot({ path: `/opt/cursor/artifacts/slu-guide-${info.project.name}.png`, fullPage: false })

  await page.goto('/#/seattle/place/starbucks-coffee-company')
  await expect(page.getByText('Photo coming soon').first()).toBeVisible()
  await expect(page.locator('img[src*="starbucks-coffee-company"]')).toHaveCount(0)
  await expect(page.getByText('bragging rights to the first Starbucks')).toBeVisible()
  await expect(page.getByText('moved to this Pike Place shop in 1976')).toBeVisible()
  await expect(page.getByText('opened in 1971 on Western Avenue')).toBeVisible()
  await page.screenshot({ path: `/opt/cursor/artifacts/starbucks-placeholder-${info.project.name}.png`, fullPage: false })

  await page.goto('/#/seattle/place/alibi-room')
  await expect(page.locator('img[src*="alibi-room-gusto-1"]')).toHaveCount(2)
  await expect(page.locator('img[src*="alibi-room-gusto-2"]').first()).toBeAttached()

  await page.goto('/#/seattle/guide/cheap-eats')
  await expect(page.locator('#entry-alibi-room')).toHaveCount(0)
  await page.goto('/#/seattle/guide/pike-place')
  await expect(page.locator('#entry-alibi-room')).toBeVisible()

  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 700 ? 700 : 900 })
    await page.goto('/#/seattle/guide/pike-place-market')
    const slots = page.locator('.rank-slot')
    await expect(slots.first()).toHaveText('1')
    const facts = await rankFacts(page)
    const wanted = ['1', '9', '10', '11', '12', '25']
    for (const text of wanted) {
      const fact = facts.find((item) => item.text === text)
      expect(fact, `rank ${text} at ${width}`).toBeTruthy()
      expect(fact?.nowrap).toBe('nowrap')
      expect(fact?.wraps, `rank ${text} wrapped at ${width}`).toBe(false)
      expect(fact?.overflow, `rank ${text} overflowed at ${width}`).toBe(false)
    }
    const xs = facts.filter((item) => wanted.includes(item.text)).map((item) => item.nameOffset)
    expect(new Set(xs).size, `names align at ${width}: ${xs.join(',')}`).toBe(1)
    if (width === 390) {
      await slots.nth(10).evaluate((node) => node.scrollIntoView({ block: 'center' }))
      await page.screenshot({ path: `/opt/cursor/artifacts/ranks-${info.project.name}-390.png`, fullPage: false })
    }
    const hundred = await slots.first().evaluate((node) => {
      const copy = node.cloneNode(true)
      if (!(copy instanceof HTMLElement) || !node.parentElement) return { wraps: true, overflow: true }
      copy.textContent = '100'
      node.parentElement.appendChild(copy)
      const style = getComputedStyle(copy)
      const rect = copy.getBoundingClientRect()
      const line = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize)
      const result = { wraps: rect.height > line * 1.6, overflow: copy.scrollWidth > copy.clientWidth + 1 }
      copy.remove()
      return result
    })
    expect(hundred.wraps).toBe(false)
    expect(hundred.overflow).toBe(false)
  }
})

const SCORE_COLORS = {
  best: 'rgb(15, 107, 40)',
  great: 'rgb(56, 186, 70)',
  good: 'rgb(183, 227, 154)',
  fine: 'rgb(231, 178, 60)',
  skip: 'rgb(255, 83, 48)',
} as const

test('Best Breakfast includes Biscuit Bitch and score bands stay readable', async ({ page }, info) => {
  test.setTimeout(120_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.addInitScript(() => {
    localStorage.setItem('gusto.house.v1', JSON.stringify({
      'biscuit-bitch': 7.7,
      'il-bistro': 8.4,
      matsu: 8.5,
      'stampede-cocktail-club': 9.2,
      'the-doctor-s-office': 5.4,
      'seattle-biscuit-company': 6.8,
      'tilikum-place-cafe': 7.9,
      'geraldine-s-counter': 6.6,
    }))
  })

  await page.goto('/#/seattle/guides')
  const breakfast = page.getByRole('link', { name: /Best Breakfast/ }).first()
  await expect(breakfast).toContainText('19 places')
  await page.goto('/#/seattle/guide/breakfast-before-9')
  await expect(page.getByRole('heading', { level: 1, name: 'Best Breakfast' })).toBeVisible()
  const biscuit = page.locator('#entry-biscuit-bitch').first()
  await expect(biscuit.getByRole('link', { name: 'Biscuit Bitch', exact: true }).first()).toBeVisible()
  await expect(biscuit.locator('.score-badge').first()).toHaveClass(/tone-good/)
  await page.screenshot({ path: `/opt/cursor/artifacts/breakfast-biscuit-${info.project.name}.png`, fullPage: false })

  const samples = [
    ['biscuit-bitch', 'good', '7.7', 'Good'],
    ['tilikum-place-cafe', 'good', '7.9', 'Good'],
    ['seattle-biscuit-company', 'fine', '6.8', "It's fine"],
    ['geraldine-s-counter', 'fine', '6.6', "It's fine"],
    ['il-bistro', 'great', '8.4', 'Great'],
    ['matsu', 'great', '8.5', 'Great'],
    ['stampede-cocktail-club', 'best', '9.2', 'Best of the best'],
    ['the-doctor-s-office', 'skip', '5.4', 'Skip'],
  ] as const

  for (const [id, tone, score, label] of samples) {
    await page.goto(`/#/seattle/place/${id}`)
    const badge = page.locator('.score-badge').first()
    await expect(badge).toHaveClass(new RegExp(`tone-${tone}`))
    await expect(badge).toHaveAttribute('aria-label', `Gusto's Score ${score}, ${label}`)
    await expect(badge.locator('strong')).toHaveText(score)
    const paint = await badge.evaluate((node) => {
      const style = getComputedStyle(node)
      return { background: style.backgroundColor, color: style.color }
    })
    expect(paint.background).toBe(SCORE_COLORS[tone])
    if (tone === 'good' || tone === 'fine') expect(paint.color).toBe('rgb(24, 24, 24)')
    if (tone === 'best') expect(paint.color).toBe('rgb(255, 250, 243)')
  }

  const widths = info.project.name === 'webkit' ? [390] : [1440, 390]
  for (const width of widths) {
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
  await page.goto('/#/seattle/explore')
  const listButton = page.getByRole('button', { name: 'List', exact: true })
  if (await listButton.isVisible()) await listButton.click()
  const filtersButton = page.getByRole('button', { name: 'Filters', exact: true })
  if (await filtersButton.isVisible()) await filtersButton.click()
  const scoreFilter = page.locator('#explore-filters select').filter({ hasText: "It's fine" })
  await expect(scoreFilter).toBeVisible()
  await scoreFilter.selectOption('good')
  const card = page.locator('#explore-biscuit-bitch')
  await expect(card).toBeVisible()
  const mapBadge = card.locator('.score-badge')
  await expect(mapBadge).toHaveClass(/tone-good/)
  await expect(mapBadge).toContainText('7.7')
  const mapPaint = await mapBadge.evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    color: getComputedStyle(node).color,
  }))
  expect(mapPaint).toEqual({ background: SCORE_COLORS.good, color: 'rgb(24, 24, 24)' })
  await scoreFilter.selectOption('fine')
  const fineCard = page.locator('#explore-seattle-biscuit-company')
  await expect(fineCard).toBeVisible()
  const finePaint = await fineCard.locator('.score-badge').evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    color: getComputedStyle(node).color,
  }))
  expect(finePaint).toEqual({ background: SCORE_COLORS.fine, color: 'rgb(24, 24, 24)' })
  await page.screenshot({ path: `/opt/cursor/artifacts/score-bands-explore-${info.project.name}-${width}.png`, fullPage: false })
  }
})

test('Pike Place Starbucks description names the first store and the 1976 move', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.goto('/#/seattle/place/starbucks-coffee-company')
  await expect(page.getByRole('heading', { level: 1, name: 'Starbucks Coffee Company' })).toBeVisible()
  await expect(page.getByText('Photo coming soon').first()).toBeVisible()
  await expect(page.locator('img[src*="starbucks-coffee-company"]')).toHaveCount(0)
  const description = page.getByText('bragging rights to the first Starbucks')
  await expect(description).toBeVisible()
  await expect(description).toContainText('opened in 1971 on Western Avenue')
  await expect(description).toContainText('moved to this Pike Place shop in 1976')
  await expect(description).not.toContainText('opened in 1971 at 1912')
  await page.goto('/#/seattle/guide/pike-place')
  const entry = page.locator('#entry-starbucks-coffee-company').first()
  await expect(entry.getByText('bragging rights to the first Starbucks')).toBeVisible()
  await expect(entry.getByText('moved to this Pike Place shop in 1976')).toBeVisible()
  await page.goto('/#/seattle/guide/best-coffee')
  await expect(page.locator('#entry-starbucks-coffee-company').first().getByText('the first Starbucks')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/seattle/place/starbucks-coffee-company')
  await expect(page.getByText('moved to this Pike Place shop in 1976')).toBeVisible()
  await expect(page.getByText('Photo coming soon').first()).toBeVisible()
})
