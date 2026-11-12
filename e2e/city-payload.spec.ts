import { expect, test } from '@playwright/test'

test('a seattle page fetches seattle, not the other cities', async ({ page }) => {
  const urls: string[] = []
  page.on('request', (req) => urls.push(req.url()))
  await page.goto('/#/seattle')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.home-shortcut').first()).toBeVisible()
  const slim = urls.filter((url) => url.includes('slim-'))
  expect(slim.some((url) => url.includes('slim-index'))).toBe(true)
  expect(slim.some((url) => url.includes('slim-city-seattle'))).toBe(true)
  for (const other of ['la', 'sf', 'nyc', 'portland', 'vancouver', 'sandiego', 'pullman', 'moscow']) {
    expect(slim.some((url) => url.includes(`slim-city-${other}`)), other).toBe(false)
  }
  expect(urls.some((url) => url.includes('/places.json') || url.includes('/nyc.json') || url.includes('/la.json'))).toBe(false)
})

test('a seattle guide loads the seattle guides, not every city', async ({ page }) => {
  const urls: string[] = []
  page.on('request', (req) => urls.push(req.url()))
  await page.goto('/#/seattle/guide/classics')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect.poll(() => urls.some((url) => url.includes('/guides.json'))).toBe(true)
  expect(urls.some((url) => url.includes('/places.json') || url.includes('/nyc.json') || url.includes('/la.json'))).toBe(false)
})
