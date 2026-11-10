import { expect, test } from '@playwright/test'

test('Best Breakfast on the Eastside replaces the old brunch link', async ({ page }) => {
  await page.goto('/#/eastside/guide/eastside-brunch')
  await expect(page).toHaveURL(/\/eastside\/guide\/best-breakfast-on-the-east-side$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Best Breakfast on the Eastside' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(12)
  await expect(page.locator('#entry-village-square-cafe')).toBeVisible()
  await expect(page.locator('#entry-13-coins')).toBeVisible()
  await expect(page.locator('#entry-deru-market')).toBeVisible()
  await page.goto('/#/eastside/guides')
  await expect(page.getByRole('link', { name: /Eastside brunch/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Best Breakfast on the Eastside/ })).toBeVisible()
  await page.goto('/#/eastside/guide/kirkland')
  await expect(page).toHaveURL(/\/eastside\/guide\/kirkland$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Best of Kirkland' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(12)
})

test('Eastside area tiles say the city, and the guide keeps its title', async ({ page }) => {
  await page.goto('/#/eastside/guides')
  const cities = page.getByRole('heading', { level: 2, name: 'Cities' })
  await expect(cities).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Neighborhoods' })).toHaveCount(0)
  const section = page.locator('section').filter({ has: cities })
  for (const name of ['Bellevue', 'Kirkland', 'Redmond']) {
    await expect(section.getByRole('heading', { level: 3, name, exact: true })).toBeVisible()
  }
  await expect(section.getByRole('heading', { level: 3, name: 'Bellevue Essentials' })).toHaveCount(0)
  await expect(section.getByRole('heading', { level: 3, name: 'Best of Kirkland' })).toHaveCount(0)
  await section.getByRole('link', { name: /Bellevue/ }).click()
  await expect(page).toHaveURL(/\/eastside\/guide\/bellevue$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Bellevue Essentials' })).toBeVisible()
  await page.goto('/#/eastside/guide/kirkland')
  await expect(page.getByRole('heading', { level: 1, name: 'Best of Kirkland' })).toBeVisible()
})
