import { expect, test } from '@playwright/test'

test("Shiro's shows the placeholder and the first Starbucks drops two tags", async ({ page }) => {
  await page.goto('/#/seattle/place/shiro-s-sushi-restaurant')
  await expect(page.getByRole('heading', { level: 1, name: "Shiro's Sushi Restaurant" })).toBeVisible()
  await expect(page.getByText('Photo coming soon').first()).toBeVisible()
  await expect(page.locator('img[src*="shiro-s-sushi-restaurant"]')).toHaveCount(0)
  await expect(page.getByText('2401 2nd Ave')).toBeVisible()

  await page.goto('/#/seattle/place/starbucks-coffee-company')
  await expect(page.getByText('1912 Pike Pl')).toBeVisible()
  await expect(page.getByText('Work From Café')).toHaveCount(0)
  await expect(page.getByText('Cheap Eats')).toHaveCount(0)
  await expect(page.getByText('Coffee & Pastry')).toBeVisible()
  await expect(page.getByText('bragging rights to the first Starbucks')).toBeVisible()

  await page.goto('/#/seattle/guide/cheap-eats')
  await expect(page.locator('#entry-starbucks-coffee-company')).toHaveCount(0)
  await page.goto('/#/seattle/guide/pike-place')
  await expect(page.locator('#entry-starbucks-coffee-company')).toBeVisible()
})
