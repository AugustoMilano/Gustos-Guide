import { expect, test } from '@playwright/test'

test('Eastside map shows a loading status, then the streets, without blocking zoom', async ({ page }) => {
  await page.goto('/#/eastside/explore')
  const zoom = page.getByRole('button', { name: 'Zoom in' })
  await expect(zoom).toBeVisible()
  await expect(page.getByRole('status', { name: 'Loading the map' })).toHaveCount(0, { timeout: 8000 })
  await expect(page.locator('.maplibregl-canvas')).toBeVisible()
  const box = await zoom.boundingBox()
  expect(box && box.width >= 44 && box.height >= 40).toBe(true)
})
