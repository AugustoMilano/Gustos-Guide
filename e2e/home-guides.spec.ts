import { expect, test } from '@playwright/test'

const homes = [
  ['/#/seattle', 'Date Night'],
  ['/#/la', 'Date night'],
  ['/#/sf', 'Date night'],
] as const

test('home featured rows omit Date Night and the breakfast guide keeps its route', async ({ page }) => {
  for (const [path, title] of homes) {
    await page.goto(path)
    const featured = page.getByRole('region', { name: 'Featured guides' })
    await expect(featured).toBeVisible()
    await expect(featured.getByRole('link', { name: title, exact: true })).toHaveCount(0)
  }
  await page.goto('/#/seattle')
  const seattleFeatured = page.getByRole('region', { name: 'Featured guides' })
  const featuredText = await seattleFeatured.getByRole('link').allInnerTexts()
  expect(featuredText).toHaveLength(6)
  expect(featuredText.map((text) => text.replace(/\s+/g, ' ').trim())).toEqual([
    expect.stringContaining('Pike Place Market Essentials'),
    expect.stringContaining('Best Bakeries & Pastry'),
    expect.stringContaining('Best Pizza in Seattle'),
    expect.stringContaining('Late-Night Eats'),
    expect.stringContaining('Best Cocktail Bars'),
    expect.stringContaining('Seattle Classics & Institutions'),
  ])
  expect(featuredText.join('\n')).not.toMatch(/Date Night|Bring The Parents/)
  const classics = seattleFeatured.getByRole('link', { name: 'Seattle Classics & Institutions' })
  await expect(classics).toHaveAttribute('href', /\/seattle\/guide\/classics$/)
  await expect(seattleFeatured.getByRole('link', { name: 'Best Bakeries & Pastry' })).toHaveAttribute('href', /\/seattle\/guide\/best-bakeries$/)
  await classics.click()
  await expect(page).toHaveURL(/\/seattle\/guide\/classics$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Seattle Classics & Institutions' })).toBeVisible()
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/guides\/classics\.png/)
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.getByRole('combobox', { name: 'Neighborhood' })).toBeVisible()
  await expect(page.getByText('aim for 25')).toHaveCount(0)
  await page.screenshot({ path: '/opt/cursor/artifacts/classics-filters-1440.png', fullPage: false })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: '/opt/cursor/artifacts/classics-rank-390.png', fullPage: false })
  await page.goto('/#/seattle')
  await page.getByLabel('Search guides and places').fill('date night')
  await expect(page.getByRole('link', { name: /Date Night/ })).toBeVisible()
  await page.goto('/#/seattle/guides')
  await expect(page.getByRole('link', { name: 'Best Breakfast' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Date Night' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Bring The Parents' })).toBeVisible()
  await page.goto('/#/seattle/guide/bring-the-parents')
  await expect(page.getByRole('heading', { level: 1, name: 'Bring The Parents' })).toBeVisible()
  await page.goto('/#/seattle/guide/breakfast-before-9')
  await expect(page).toHaveURL(/\/seattle\/guide\/breakfast-before-9$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Best Breakfast' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Breakfast Before 9am' })).toHaveCount(0)
})

test('Eastside featured guides fill the last slot with date night', async ({ page }) => {
  await page.goto('/#/eastside')
  const featured = page.getByRole('region', { name: 'Featured guides' })
  const links = featured.getByRole('link')
  await expect(links).toHaveCount(6)
  const labels = (await links.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim())
  expect(labels).toEqual([
    expect.stringContaining('Best of Bellevue'),
    expect.stringContaining('Bellevue Essentials'),
    expect.stringContaining('Best of Kirkland'),
    expect.stringContaining('Best Breakfast on the Eastside'),
    expect.stringContaining('Drinks on the Eastside'),
    expect.stringContaining('Eastside date night'),
  ])
  const dateNight = featured.getByRole('link', { name: /Eastside date night/ })
  await expect(dateNight).toHaveAttribute('href', /\/eastside\/guide\/eastside-date-night$/)
  const drinks = await featured.getByRole('link', { name: /Drinks on the Eastside/ }).boundingBox()
  const card = await dateNight.boundingBox()
  expect(drinks && card).toBeTruthy()
  if (page.viewportSize()!.width >= 1024) {
    expect(card!.x).toBeGreaterThan(drinks!.x)
    expect(Math.abs(card!.y - drinks!.y)).toBeLessThan(8)
  } else {
    expect(card!.y).toBeGreaterThan(drinks!.y + drinks!.height * 0.5)
  }
  await dateNight.focus()
  await expect(dateNight).toBeFocused()
  await dateNight.click()
  await expect(page).toHaveURL(/\/eastside\/guide\/eastside-date-night$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Eastside date night' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(9)
})

test('Drinks is listed before Neighborhoods on every guides index', async ({ page }) => {
  for (const [path, width, drinks] of [
    ['/#/seattle/guides', 1440, true],
    ['/#/eastside/guides', 390, false],
  ] as const) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
    await page.goto(path)
    const areaHeading = path.includes('eastside') ? 'Cities' : 'Neighborhoods'
    await expect(page.getByRole('heading', { level: 2, name: areaHeading })).toBeVisible()
    const headings = (await page.locator('#main h2').allTextContents()).map((text) => text.trim())
    if (path.includes('eastside')) {
      expect(headings).toContain('Cities')
      expect(headings).not.toContain('Neighborhoods')
      expect(headings.indexOf('Cities')).toBeGreaterThan(headings.indexOf('Occasions'))
    } else if (drinks) {
      expect(headings).toEqual(['Best of', 'Cuisines', 'Occasions', 'Drinks', 'Neighborhoods'])
    } else {
      expect(headings.indexOf('Neighborhoods')).toBeGreaterThan(headings.indexOf('Occasions'))
      expect(headings.includes('Drinks')).toBe(false)
    }
    const chips = await page.getByRole('group', { name: 'Guide categories' }).getByRole('button').allTextContents()
    expect(chips.indexOf(areaHeading)).toBeGreaterThan(chips.indexOf('Occasions'))
    if (drinks) expect(chips.indexOf('Neighborhoods')).toBeGreaterThan(chips.indexOf('Drinks'))
  }
})

test('portrait photos keep the top of the frame and the rank matches the name', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('gusto.house.v1', JSON.stringify({ 'alibi-room': 8.4, 'serious-pie': 7.2 }))
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/seattle/place/dahlia-bakery')
  const photo = page.locator('.photo-frame img.is-portrait')
  await expect(photo).toBeVisible()
  await expect(photo).toHaveCSS('object-position', '50% 18%')
  await page.goto('/#/seattle/guide/best-pizza')
  const rank = page.locator('.guide-entry .rank-slot').first()
  await expect(rank).toBeVisible()
  const size = await rank.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize))
  expect(size).toBeGreaterThanOrEqual(34)
})
