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

test('neighborhood, score, and visit use the cuisine control', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
    await page.goto('/#/seattle/explore')
    await showFilters(page)
    const filters = page.locator('#explore-filters .cuisine-picker-button')
    await expect(filters).toHaveCount(4)
    await expect(page.locator('#explore-filters select')).toHaveCount(0)
    const metrics = await filters.evaluateAll((nodes) => nodes.map((node) => {
      const style = getComputedStyle(node)
      const value = node.querySelector('.cuisine-picker-value')
      const valueStyle = value ? getComputedStyle(value) : null
      const box = node.getBoundingClientRect()
      return {
        height: Math.round(box.height),
        width: Math.round(box.width),
        borderTopWidth: style.borderTopWidth,
        borderTopColor: style.borderTopColor,
        borderRadius: style.borderTopLeftRadius,
        fontWeight: valueStyle?.fontWeight ?? '',
        fontSize: valueStyle?.fontSize ?? '',
        chevron: node.querySelector('svg') != null,
      }
    }))
    for (const metric of metrics) expect(metric).toEqual(metrics[0])
    expect(metrics[0].height).toBeGreaterThanOrEqual(44)
    expect(metrics[0].borderTopWidth).toBe('2px')
    expect(metrics[0].borderRadius).toBe('0px')
    expect(metrics[0].chevron).toBe(true)
    expect(Math.abs(metrics[0].width - metrics[1].width)).toBeLessThanOrEqual(2)
    expect(Math.abs(metrics[2].width - metrics[3].width)).toBeLessThanOrEqual(2)
    await expect(page.locator('#explore-filters .price-filter .chip').first()).toBeVisible()
  }
  await page.getByRole('button', { name: /^Neighborhood/ }).click()
  await page.getByRole('option', { name: 'Ballard', exact: true }).click()
  await expect(page.locator('#explore-the-walrus-and-the-carpenter')).toBeVisible()
  await page.getByRole('button', { name: /To go \/ Been/ }).focus()
  await page.keyboard.press('ArrowDown')
  await page.getByRole('option', { name: 'To go', exact: true }).click()
  await expect(page.getByRole('button', { name: /To go \/ Been/ })).toContainText('To go')
})
