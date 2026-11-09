import { expect, test } from '@playwright/test'

test('East Bay, Peninsula, and North Bay each have one featured guide', async ({ page }) => {
  await page.goto('/#/eastbay')
  await expect(page.getByRole('region', { name: 'Featured guides' }).getByRole('link', { name: /East Bay/ })).toBeVisible()
  await page.goto('/#/eastbay/guide/eastbay-berkeley')
  await expect(page).toHaveURL(/\/eastbay\/guide\/east-bay$/)
  await expect(page.getByRole('heading', { level: 1, name: 'East Bay' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(4)

  await page.goto('/#/peninsula/guide/peninsula-palo-alto')
  await expect(page).toHaveURL(/\/peninsula\/guide\/peninsula$/)
  await expect(page.locator('article.guide-entry')).toHaveCount(9)

  await page.goto('/#/northbay/guide/northbay-sausalito')
  await expect(page).toHaveURL(/\/northbay\/guide\/north-bay$/)
  await expect(page.locator('article.guide-entry')).toHaveCount(6)
})
