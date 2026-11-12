import { expect, test, type Page } from '@playwright/test'

async function scrollBy(page: Page, delta: number) {
  await page.evaluate((dy) => {
    const root = document.scrollingElement ?? document.documentElement
    const y = Math.max(0, Math.min(root.scrollHeight - root.clientHeight, root.scrollTop + dy))
    root.scrollTop = y
    window.scrollTo(0, y)
    window.dispatchEvent(new Event('scroll'))
  }, delta)
}

test('the back control and city tabs hide on scroll and the logo stays', async ({ page }, info) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  const phone = info.project.name === 'webkit'
  await page.setViewportSize({ width: phone ? 390 : 1440, height: phone ? 844 : 900 })

  const routes = ['/#/seattle/place/storyville-coffee-company', '/#/seattle/guide/pike-place', '/#/seattle/guides']
  for (const route of routes) {
    await page.goto(route)
    const sub = page.locator('.header-sub')
    await expect(sub).toBeVisible()
    await page.waitForFunction(() => {
      const root = document.scrollingElement ?? document.documentElement
      return root.scrollHeight > root.clientHeight + 80
    })
    await scrollBy(page, -4000)
    await expect(sub).toHaveAttribute('data-concealed', 'false')
    await expect(sub.getByRole('link', { name: /Seattle/ })).toBeVisible()
    if (phone) {
      const east = await page.locator('.city-switch-btn', { hasText: 'Eastside' }).evaluate((node) => node.getBoundingClientRect().right)
      expect(east).toBeLessThanOrEqual(390)
    }
    await expect(page.locator('.wordmark')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
    const open = await page.evaluate(() => {
      const header = document.querySelector('.site-header')!.getBoundingClientRect().height
      const offset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-offset'))
      return { header, offset }
    })
    expect(Math.abs(open.header - open.offset)).toBeLessThan(2)
    const place = route.includes('/place/')
    if (place) {
      await expect(page.getByRole('heading', { name: 'Storyville Coffee Company' })).toBeVisible()
      await page.screenshot({ path: `/opt/cursor/artifacts/subheader-visible-${info.project.name}.png`, animations: 'disabled' })
    }

    await scrollBy(page, 900)
    await expect(sub).toHaveAttribute('data-concealed', 'true')
    await expect(page.locator('.wordmark')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
    await expect(page.locator('.bell-btn')).toBeVisible()
    const hidden = await page.evaluate(() => {
      const header = document.querySelector('.site-header')!.getBoundingClientRect().height
      const offset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-offset'))
      const main = document.querySelector('main')!
      const pad = Number.parseFloat(getComputedStyle(main).paddingTop)
      return { header, offset, pad }
    })
    expect(Math.abs(hidden.header - hidden.offset)).toBeLessThan(2)
    const box = await sub.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      return { height: rect.height, width: rect.width }
    })
    expect(box.height).toBeLessThan(2)
    if (phone) {
      expect(hidden.header).toBeLessThan(open.header - 20)
      expect(Math.abs(hidden.pad - hidden.header - 16)).toBeLessThan(3)
    } else {
      expect(box.width).toBeLessThan(2)
    }
    if (place) {
      await page.screenshot({ path: `/opt/cursor/artifacts/subheader-hidden-${info.project.name}.png`, animations: 'disabled' })
    }

    await scrollBy(page, -400)
    await expect(sub).toHaveAttribute('data-concealed', 'false')
    await expect(sub.getByRole('link', { name: /Seattle/ })).toBeVisible()
    await expect(page.locator('.wordmark')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
    const back = await page.evaluate(() => {
      const header = document.querySelector('.site-header')!.getBoundingClientRect().height
      const offset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-offset'))
      return { header, offset }
    })
    expect(Math.abs(back.header - back.offset)).toBeLessThan(2)
    if (phone) expect(back.header).toBeGreaterThan(hidden.header + 20)
    if (place) {
      await page.screenshot({ path: `/opt/cursor/artifacts/subheader-revealed-${info.project.name}.png`, animations: 'disabled' })
    }
  }
})
