import { expect, test, type Page } from '@playwright/test'

async function shot(page: Page) {
  const img = page.locator('.photo-frame img').first()
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  expect(await img.evaluate((node) => getComputedStyle(node).objectFit)).toBe('cover')
  return img.evaluate((node) => (node as HTMLImageElement).currentSrc || (node as HTMLImageElement).src)
}

test('La Loba, Piroshky, Maiz, and Mr. Fish show the new unblurred photos in order', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.goto('/#/seattle/place/la-loba')
  await expect(page.getByRole('heading', { level: 1, name: 'La Loba' })).toBeVisible()
  await expect(page.locator('.photo-thumb')).toHaveCount(18)
  expect(await shot(page)).toContain('la-loba-gusto-1')
  await page.getByRole('tab', { name: 'Photo 18 of 18' }).click()
  expect(await shot(page)).toContain('la-loba-gusto-18')

  await page.goto('/#/seattle/place/mr-fish-chips-chowder')
  await expect(page.locator('.photo-thumb')).toHaveCount(2)
  expect(await shot(page)).toContain('mr-fish-chips-chowder-gusto-1')
  await page.getByRole('tab', { name: 'Photo 2 of 2' }).click()
  expect(await shot(page)).toContain('mr-fish-chips-chowder-gusto-2')

  await page.goto('/#/seattle/place/piroshky-piroshky')
  await expect(page.locator('.photo-thumb')).toHaveCount(2)
  expect(await shot(page)).toContain('piroshky-piroshky-gusto-1')

  await page.goto('/#/seattle/place/maiz')
  expect(await shot(page)).toContain('maiz-gusto-1')

  await page.goto('/#/seattle/place/pasta-casalinga')
  await expect(page.locator('.score-badge').first()).toContainText('8.0')
})
