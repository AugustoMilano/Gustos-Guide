import { expect, test, type Page } from '@playwright/test'

async function showFilters(page: Page) {
  await expect(page.locator('.explore-list')).toBeVisible()
  const filters = page.locator('#explore-filters')
  if ((page.viewportSize()?.width ?? 0) < 768) {
    const list = page.getByRole('button', { name: 'List', exact: true })
    if (await list.isVisible().catch(() => false)) await list.click()
    await page.getByRole('button', { name: 'Filters' }).click()
  }
  await expect(filters).toBeVisible()
}

test.describe('explore cuisine menu', () => {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
  ]) {
    test(`${viewport.name} searches a bounded menu and keeps the stored category`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/#/seattle/explore')
      await page.evaluate(() => sessionStorage.clear())
      await page.reload()
      await showFilters(page)
      await page.getByRole('button', { name: /^Cuisine/ }).click()
      const menu = page.locator('.cuisine-menu')
      await expect(menu).toBeVisible()
      const box = await menu.boundingBox()
      expect(box).toBeTruthy()
      expect(box!.height).toBeLessThanOrEqual(300)
      expect(box!.height).toBeLessThan(viewport.height * 0.55)
      expect(box!.width).toBeLessThan(viewport.width * 0.85)
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1)
      const labels = await page.getByRole('option').allTextContents()
      expect(labels).toContain('Chinese (Dumplings)')
      expect(labels).toContain('Congee')
      expect(labels).toContain('Chicken (Rotisserie)')
      expect(labels).not.toContain('Chinese (Dumplings')
      expect(labels).not.toContain('Congee)')
      expect(labels).not.toContain('Chicken (Rotisserie')
      await page.getByLabel('Find a cuisine').fill('dumpling')
      await expect(page.getByRole('option', { name: 'Chinese (Dumplings)', exact: true })).toBeVisible()
      await expect(page.getByRole('option', { name: 'Dim Sum', exact: true })).toHaveCount(0)
      await page.getByRole('option', { name: 'Chinese (Dumplings)', exact: true }).click()
      await expect(menu).toBeHidden()
      await expect(page.getByRole('link', { name: /Dough Zone/ })).toBeVisible()
      await expect(page.getByRole('link', { name: /ALTITUDE Sky Lounge/ })).toHaveCount(0)
      const stored = await page.evaluate(() => sessionStorage.getItem('gusto.explore.view.seattle') ?? '')
      expect(JSON.parse(stored).cuisine).toBe('Chinese (Dumplings')
      await page.reload()
      await showFilters(page)
      await expect(page.getByRole('button', { name: /Chinese \(Dumplings\)/ })).toBeVisible()
      await expect(page.getByRole('link', { name: /Dough Zone/ })).toBeVisible()
    })
  }
})
