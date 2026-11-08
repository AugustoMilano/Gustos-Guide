import { expect, test } from '@playwright/test'

test.describe('top navigation says Map', () => {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
  ]) {
    test(`${viewport.name} keeps the explore route`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/#/seattle')
      const primary = page.getByRole('navigation', { name: 'Primary' })
      if (viewport.width >= 1280) {
        const map = primary.getByRole('link', { name: 'Map', exact: true })
        await expect(map).toBeVisible()
        await expect(primary.getByRole('link', { name: 'Explore', exact: true })).toHaveCount(0)
        await map.click()
        await expect(map).toHaveAttribute('aria-current', 'page')
      } else {
        const tab = page.getByRole('tab', { name: 'Map', exact: true })
        await expect(tab).toBeVisible()
        await page.getByRole('button', { name: 'Menu' }).click()
        const menu = page.getByRole('navigation', { name: 'Menu' })
        const map = menu.getByRole('link', { name: 'Map', exact: true })
        await expect(map).toBeVisible()
        await expect(menu.getByRole('link', { name: 'Explore', exact: true })).toHaveCount(0)
        await map.click()
        await expect(tab).toHaveAttribute('aria-current', 'page')
      }
      await expect(page).toHaveURL(/\/explore$/)
      await expect(page.getByRole('heading', { name: /Explore Seattle/ })).toBeVisible()
    })
  }
})
