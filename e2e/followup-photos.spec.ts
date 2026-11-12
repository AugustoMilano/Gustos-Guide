import { expect, test, type Page } from '@playwright/test'

async function frame(page: Page) {
  const img = page.locator('.photo-frame img').first()
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  expect(await img.evaluate((node) => getComputedStyle(node).objectFit)).toBe('cover')
  return img.evaluate((node) => {
    const image = node as HTMLImageElement
    return { src: image.currentSrc || image.src, width: image.naturalWidth, height: image.naturalHeight }
  })
}

test('follow-up house photos keep the supplied order on the matched places', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort())

  await page.goto('/#/seattle/place/cafe-flora')
  await expect(page.getByRole('heading', { level: 1, name: 'Cafe Flora' })).toBeVisible()
  await expect(page.locator('.photo-thumb')).toHaveCount(6)
  const flora = await frame(page)
  expect(flora.src).toContain('cafe-flora-gusto-1')
  expect(flora.height).toBeGreaterThan(flora.width)

  await page.goto('/#/seattle/place/atoma')
  await expect(page.locator('.photo-thumb')).toHaveCount(10)
  expect((await frame(page)).src).toContain('atoma-gusto-1')
  await page.getByRole('tab', { name: 'Photo 10 of 10' }).click()
  expect((await frame(page)).src).toContain('atoma-gusto-10')

  await page.goto('/#/seattle/place/saint-bread')
  await expect(page.locator('.photo-thumb')).toHaveCount(6)
  await page.getByRole('tab', { name: 'Photo 3 of 6' }).click()
  const interior = await frame(page)
  expect(interior.src).toContain('saint-bread-gusto-3')
  expect(interior.height).toBeGreaterThan(interior.width)

  await page.goto('/#/seattle/place/the-other-coast-cafe')
  await expect(page.locator('.photo-thumb')).toHaveCount(2)
  const storefront = await frame(page)
  expect(storefront.src).toContain('the-other-coast-cafe-gusto-1')
  expect(storefront.height).toBeGreaterThan(storefront.width)
  await page.getByRole('tab', { name: 'Photo 2 of 2' }).click()
  const sandwich = await frame(page)
  expect(sandwich.src).toContain('the-other-coast-cafe-gusto-2')
  expect(sandwich.width).toBeGreaterThan(sandwich.height)

  await page.goto('/#/seattle/place/hushy-s-sandwiches')
  await expect(page.getByRole('heading', { level: 1, name: "Hushy's Sandwiches" })).toBeVisible()
  expect((await frame(page)).src).toContain('hushy-s-sandwiches-gusto-1')

  await page.goto('/#/seattle/place/kangaroo-kiwi')
  expect((await frame(page)).src).toContain('kangaroo-kiwi-gusto-1')
  await expect(page.locator('.photo-thumb')).toHaveCount(0)

  await page.goto('/#/eastside/place/shawns-cafe-and-bakery')
  await expect(page.getByRole('heading', { level: 1, name: "Shawn's Cafe and Bakery" })).toBeVisible()
  await expect(page.locator('.photo-thumb')).toHaveCount(2)
  expect((await frame(page)).src).toContain('shawns-cafe-and-bakery-gusto-1')

  await page.goto('/#/seattle/place/pasta-casalinga')
  await expect(page.locator('.score-badge').first()).toContainText('8.0')
})
