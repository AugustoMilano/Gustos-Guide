import { expect, test, type Page } from '@playwright/test'

async function srcOf(page: Page) {
  const img = page.locator('.photo-frame img').first()
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  expect(await img.evaluate((node) => getComputedStyle(node).objectFit)).toBe('cover')
  return img.evaluate((node) => (node as HTMLImageElement).currentSrc || (node as HTMLImageElement).src)
}

test('recovered photos keep Storyville, Von\'s, and Hellenika order', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.goto('/#/seattle/place/storyville-coffee-company')
  await expect(page.locator('.photo-thumb')).toHaveCount(3)
  expect(await srcOf(page)).toContain('storyville-coffee-company-gusto-1')
  await page.getByRole('tab', { name: 'Photo 3 of 3' }).click()
  expect(await srcOf(page)).toContain('storyville-coffee-company-gusto-3')

  await page.goto('/#/seattle/place/von-s-1000spirits')
  await expect(page.locator('.photo-thumb')).toHaveCount(3)
  expect(await srcOf(page)).toContain('von-s-1000spirits-gusto-1')
  await page.getByRole('tab', { name: 'Photo 3 of 3' }).click()
  expect(await srcOf(page)).toContain('von-s-1000spirits-gusto-3')

  await page.goto('/#/seattle/place/hellenika-cultured-creamery')
  await expect(page.locator('.photo-thumb')).toHaveCount(2)
  const first = await srcOf(page)
  expect(first).toContain('hellenika-cultured-creamery')
  expect(first).not.toContain('gusto')
  await page.getByRole('tab', { name: 'Photo 2 of 2' }).click()
  expect(await srcOf(page)).toContain('hellenika-cultured-creamery-gusto-2')

  await page.goto('/#/seattle/place/starbucks-coffee-company')
  await expect(page.getByText('1912 Pike Pl')).toBeVisible()
  expect(await srcOf(page)).toContain('starbucks-coffee-company-gusto-1')

  await page.goto('/#/seattle/place/pasta-casalinga')
  expect(await srcOf(page)).toContain('pasta-casalinga-gusto-1')
  await expect(page.locator('.score-badge').first()).toContainText('8.0')

  await page.goto('/#/eastside/place/cactus-kirkland')
  await expect(page.getByText('121 Park Ln')).toBeVisible()
  expect(await srcOf(page)).toContain('cactus-kirkland-gusto-1')
  await page.goto('/#/eastside/place/din-tai-fung-bellevue')
  await expect(page.getByText('10455 NE 8th St')).toBeVisible()
  expect(await srcOf(page)).toContain('din-tai-fung-bellevue-gusto-1')
  await page.goto('/#/eastside/place/kobuta-and-ookami-redmond')
  await expect(page.getByText('17026 Avondale Way')).toBeVisible()
  expect(await srcOf(page)).toContain('kobuta-and-ookami-redmond-gusto-1')
  await page.goto('/#/eastside/place/beachhouse-bar-and-grill')
  await expect(page.getByText('6023 Lake Washington Blvd NE')).toBeVisible()
  expect(await srcOf(page)).toContain('beachhouse-bar-and-grill-gusto-1')
})
