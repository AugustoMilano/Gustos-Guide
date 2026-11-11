import { expect, test } from '@playwright/test'

test('the guide filter bar hides on the way down and returns on the way up', async ({ page }, info) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  const phone = info.project.name === 'webkit'
  await page.setViewportSize({ width: phone ? 390 : 1440, height: phone ? 844 : 900 })
  await page.goto('/#/seattle/guide/pike-place')
  const dock = page.locator('.guide-filter-dock')
  await expect(dock).toBeVisible()
  await expect(dock).toHaveAttribute('data-concealed', 'false')
  if (phone) await expect(dock.getByRole('link', { name: 'Map' })).toBeVisible()
  else await expect(dock.getByRole('button', { name: 'Open now' })).toBeVisible()
  await expect(page.locator('.wordmark')).toBeVisible()
  await expect(page.locator('.city-switch-bar')).toBeVisible()
  await page.screenshot({ path: `/opt/cursor/artifacts/filters-visible-${info.project.name}.png`, animations: 'disabled' })

  await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement
    root.scrollTop = 1600
    window.scrollTo(0, 1600)
    window.dispatchEvent(new Event('scroll'))
  })
  await expect(dock).toHaveAttribute('data-concealed', 'true')
  const parked = await page.locator('article.guide-entry').first().evaluate((node) => node.getBoundingClientRect().top)
  await page.waitForTimeout(350)
  const still = await page.locator('article.guide-entry').first().evaluate((node) => node.getBoundingClientRect().top)
  expect(Math.abs(still - parked)).toBeLessThan(2)
  await expect(page.locator('.wordmark')).toBeVisible()
  await expect(page.locator('.header-sub')).toHaveAttribute('data-concealed', 'true')
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
  await page.screenshot({ path: `/opt/cursor/artifacts/filters-hidden-${info.project.name}.png`, animations: 'disabled' })

  await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement
    root.scrollTop = Math.max(0, root.scrollTop - 400)
    window.scrollTo(0, root.scrollTop)
    window.dispatchEvent(new Event('scroll'))
  })
  await expect(dock).toHaveAttribute('data-concealed', 'false')
  await expect(phone ? dock.getByRole('link', { name: 'Map' }) : dock.getByRole('button', { name: 'Open now' })).toBeVisible()
  await page.screenshot({ path: `/opt/cursor/artifacts/filters-revealed-${info.project.name}.png`, animations: 'disabled' })

  if (!phone) {
    await page.goto('/#/eastside/guide/bellevue')
    const east = page.locator('.guide-filter-dock')
    await expect(east).toHaveAttribute('data-concealed', 'false')
    await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement
      root.scrollTop = 1600
      window.scrollTo(0, 1600)
      window.dispatchEvent(new Event('scroll'))
    })
    await expect(east).toHaveAttribute('data-concealed', 'true')
    await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement
      root.scrollTop = Math.max(0, root.scrollTop - 320)
      window.scrollTo(0, root.scrollTop)
      window.dispatchEvent(new Event('scroll'))
    })
    await expect(east).toHaveAttribute('data-concealed', 'false')
  }
})
