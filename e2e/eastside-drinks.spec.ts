import { expect, test } from '@playwright/test'

const names = [
  'Woodblock',
  'Postdoc Brewing',
  'Bellevue Brewing Company',
  'Earls Kitchen + Bar',
  'Tavern Hall',
  'Moss Bay Hall',
  'Central Bar + Restaurant',
  "Palmer's East",
  'Central Tavern',
  'The Goose Pub & Eatery',
  '520 Bar and Grill',
  'Civility & Unrest',
]

test('Eastside home and guides index open Drinks on the Eastside', async ({ page }) => {
  await page.goto('/#/eastside')
  await page.getByRole('region', { name: 'Featured guides' }).getByRole('link', { name: /Drinks on the Eastside/ }).click()
  await expect(page).toHaveURL(/\/eastside\/guide\/eastside-drinks$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Drinks on the Eastside' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(names.length)
  for (const name of names) {
    await expect(page.locator('article.guide-entry').getByRole('heading', { level: 3, name, exact: true })).toBeVisible()
  }
  await expect(page.locator('#entry-barrels-wine-bar')).toHaveCount(0)
  await page.goto('/#/eastside/guides')
  await expect(page.getByRole('heading', { level: 2, name: 'Drinks' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Drinks on the Eastside/ })).toBeVisible()
})
