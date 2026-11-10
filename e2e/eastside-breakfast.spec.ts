import { expect, test } from '@playwright/test'

test('Best Breakfast on the East Side replaces the old brunch link', async ({ page }) => {
  await page.goto('/#/eastside/guide/eastside-brunch')
  await expect(page).toHaveURL(/\/eastside\/guide\/best-breakfast-on-the-east-side$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Best Breakfast on the East Side' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(12)
  await expect(page.locator('#entry-village-square-cafe')).toBeVisible()
  await expect(page.locator('#entry-13-coins')).toBeVisible()
  await expect(page.locator('#entry-deru-market')).toBeVisible()
  await page.goto('/#/eastside/guides')
  await expect(page.getByRole('link', { name: /Eastside brunch/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Best Breakfast on the East Side/ })).toBeVisible()
})
