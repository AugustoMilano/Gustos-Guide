import { expect, test, type Page } from '@playwright/test'

async function loaded(page: Page) {
  const img = page.locator('.photo-frame img').first()
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  const fit = await img.evaluate((node) => getComputedStyle(node).objectFit)
  expect(fit).toBe('cover')
  return img.evaluate((node) => {
    const image = node as HTMLImageElement
    return { src: image.currentSrc || image.src, width: image.naturalWidth, height: image.naturalHeight }
  })
}

test('reviewed house photos lead the gallery without replacing missing shots', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.goto('/#/seattle/place/storyville-coffee-company')
  await expect(page.getByRole('heading', { level: 1, name: 'Storyville Coffee Company' })).toBeVisible()
  const story = await loaded(page)
  expect(story.src).toContain('storyville-coffee-company-gusto-1')
  expect(story.width).toBeGreaterThan(story.height)
  await expect(page.getByText('Photo by Gusto').first()).toBeVisible()
  await expect(page.locator('.photo-thumb')).toHaveCount(0)

  await page.goto('/#/seattle/place/the-shop-by-porter')
  await expect(page.locator('.photo-thumb')).toHaveCount(2)
  const first = await loaded(page)
  expect(first.src).toContain('the-shop-by-porter-gusto-1')
  expect(first.height).toBeGreaterThan(first.width)
  await page.getByRole('tab', { name: 'Photo 2 of 2' }).click()
  const second = await loaded(page)
  expect(second.src).toContain('the-shop-by-porter-gusto-2')
  expect(second.width).toBeGreaterThan(second.height)

  await page.goto('/#/seattle/place/beecher-s-handmade-cheese')
  const beecher = await loaded(page)
  expect(beecher.src).toContain('beecher-s-handmade-cheese-gusto-1')
  expect(beecher.height).toBeGreaterThan(beecher.width)

  await page.goto('/#/seattle/place/palace-kitchen')
  await expect(page.locator('.photo-thumb')).toHaveCount(7)
  const palace = await loaded(page)
  expect(palace.src).toContain('palace-kitchen-gusto-1')

  await page.goto('/#/seattle/place/hellenika-cultured-creamery')
  const hellenika = await loaded(page)
  expect(hellenika.src).toContain('hellenika-cultured-creamery')
  expect(hellenika.src).not.toContain('gusto')

  await page.goto('/#/seattle/place/pasta-casalinga')
  await expect(page.locator('.score-badge').first()).toContainText('8.0')
  await expect(page.locator('.photo-frame img')).toHaveCount(0)
})
