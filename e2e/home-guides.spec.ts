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
  await expect(page.getByRole('region', { name: 'Featured guides' }).getByRole('link', { name: 'Best Pizza in Seattle' })).toBeVisible()
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
