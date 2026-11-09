import { expect, test } from '@playwright/test'

const homes = [
  ['/#/seattle', 'Date Night'],
  ['/#/eastside', 'Eastside date night'],
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

test('Drinks is listed before Neighborhoods on every guides index', async ({ page }) => {
  for (const [path, width] of [['/#/seattle/guides', 1440], ['/#/eastside/guides', 390]] as const) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 2, name: 'Drinks' })).toBeVisible()
    const headings = (await page.locator('#main h2').allTextContents()).map((text) => text.trim())
    expect(headings.indexOf('Neighborhoods')).toBeGreaterThan(headings.indexOf('Drinks'))
    expect(headings).toEqual(['Best of', 'Cuisines', 'Occasions', 'Drinks', 'Neighborhoods'])
    const chips = page.getByRole('group', { name: 'Guide categories' })
    const chipText = await chips.getByRole('button').allTextContents()
    expect(chipText).toEqual(['All', 'Best of', 'Cuisines', 'Occasions', 'Drinks', 'Neighborhoods'])
  }
})
