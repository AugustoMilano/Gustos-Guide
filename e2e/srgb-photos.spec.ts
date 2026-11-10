import { expect, test, type Page } from '@playwright/test'

async function shot(page: Page) {
  const img = page.locator('.photo-frame img').first()
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  expect(await img.evaluate((node) => getComputedStyle(node).objectFit)).toBe('cover')
  return img.evaluate((node) => {
    const image = node as HTMLImageElement
    return { src: image.currentSrc || image.src, width: image.naturalWidth, height: image.naturalHeight }
  })
}

test('corrected photos keep order, blur limits, and the seven ratings', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.goto('/#/seattle/place/storyville-coffee-company')
  const story = await shot(page)
  expect(story.src).toContain('storyville-coffee-company-gusto-1')
  expect(story.width).toBeGreaterThan(story.height)

  await page.goto('/#/seattle/place/cafe-flora')
  await expect(page.locator('.photo-thumb')).toHaveCount(6)
  expect((await shot(page)).src).toContain('cafe-flora-gusto-1')

  await page.goto('/#/eastside/place/sparrow')
  await expect(page.getByRole('heading', { level: 1, name: 'Sparrow' })).toBeVisible()
  await expect(page.locator('.photo-thumb')).toHaveCount(5)
  expect((await shot(page)).src).toContain('sparrow-gusto-1')

  await page.goto('/#/seattle/place/cortina')
  expect((await shot(page)).src).toContain('cortina-gusto-1')
  await expect(page.locator('.score-badge').first()).toContainText('7.0')

  await page.goto('/#/eastside/place/lexperience-paris')
  await expect(page.getByRole('heading', { level: 1, name: "L'Experience Paris" })).toBeVisible()
  expect((await shot(page)).src).toContain('lexperience-paris-gusto-1')

  await page.goto('/#/eastside/place/central-bar-restaurant')
  expect((await shot(page)).src).toContain('central-bar-restaurant-gusto-1')
  await page.goto('/#/eastside/place/central-tavern')
  await expect(page.locator('.photo-frame img')).toHaveCount(0)

  await page.goto('/#/seattle/place/hellenika-cultured-creamery')
  const hellenika = await shot(page)
  expect(hellenika.src).toContain('hellenika-cultured-creamery')
  expect(hellenika.src).not.toContain('gusto')

  await page.goto('/#/seattle/place/pasta-casalinga')
  await expect(page.locator('.score-badge').first()).toContainText('8.0')
})
