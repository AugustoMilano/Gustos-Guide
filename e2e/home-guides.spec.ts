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
    expect.stringContaining('Bring The Parents'),
  ])
  expect(featuredText.join('\n')).not.toMatch(/Date Night/)
  await expect(seattleFeatured.getByRole('link', { name: 'Best Bakeries & Pastry' })).toHaveAttribute('href', /\/seattle\/guide\/best-bakeries$/)
  await page.getByLabel('Search guides and places').fill('date night')
  await expect(page.getByRole('link', { name: /Date Night/ })).toBeVisible()
  await page.goto('/#/seattle/guides')
  await expect(page.getByRole('link', { name: 'Best Breakfast' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Date Night' })).toBeVisible()
  await page.goto('/#/seattle/guide/breakfast-before-9')
  await expect(page).toHaveURL(/\/seattle\/guide\/breakfast-before-9$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Best Breakfast' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Breakfast Before 9am' })).toHaveCount(0)
})
