import { expect, test } from '@playwright/test'

test('Moscow features Best of Moscow, ID and the old café link follows it', async ({ page }) => {
  await page.goto('/#/moscow')
  const featured = page.getByRole('region', { name: 'Featured guides' })
  await expect(featured.getByRole('link', { name: /Best of Moscow, ID/ })).toBeVisible()
  await expect(featured.getByRole('link', { name: /^Cafe/ })).toHaveCount(0)
  await page.goto('/#/moscow/guide/mos-cafe')
  await expect(page).toHaveURL(/\/moscow\/guide\/best-of-moscow-id$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Best of Moscow, ID' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(15)
  await expect(page.locator('#entry-paradise-grill-and-cafe')).toBeVisible()
  await expect(page.locator('#entry-moscow-bagel-and-deli')).toBeVisible()
})
