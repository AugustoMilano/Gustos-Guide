import { expect, test } from '@playwright/test'

test('the home page does not download MapLibre until the map opens', async ({ page }) => {
  const hits: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('maplibre-gl')) hits.push(req.url())
  })
  await page.goto('/#/seattle')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(hits).toEqual([])
  await page.getByRole('link', { name: 'Map' }).first().click()
  await expect(page.locator('.maplibregl-canvas')).toBeVisible()
  expect(hits.length).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible()
})
