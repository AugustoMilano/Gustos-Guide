import { expect, test, type Page } from '@playwright/test'

function contrast(fg: string, bg: string) {
  const parts = (value: string) => value.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0]
  const lin = (channel: number) => {
    const s = channel / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const L = (value: string) => {
    const [r, g, b] = parts(value)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  }
  const a = L(fg)
  const b = L(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

async function openList(page: Page) {
  const list = page.getByRole('button', { name: 'List', exact: true })
  if (await list.isVisible().catch(() => false)) await list.click()
}

async function captionFits(page: Page, selector: string) {
  const mark = page.locator(selector).first()
  const caption = mark.locator('.no-photo-caption')
  await expect(caption).toHaveCount(1)
  await expect(caption).toHaveText('Photo coming soon')
  const fit = await caption.evaluate((el) => {
    const box = el.getBoundingClientRect()
    const frame = el.closest('.place-row-shot, .photo-frame, .no-photo')?.getBoundingClientRect()
    const style = getComputedStyle(el)
    return {
      color: style.color,
      background: getComputedStyle(el.parentElement!).backgroundColor,
      inside: frame != null && box.top >= frame.top - 1 && box.bottom <= frame.bottom + 1 && box.left >= frame.left - 1 && box.right <= frame.right + 1,
      overflow: el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1,
      announcements: el.parentElement?.querySelectorAll('.sr-only').length ?? 0,
    }
  })
  expect(fit.inside).toBe(true)
  expect(fit.overflow).toBe(true)
  expect(fit.announcements).toBe(0)
  expect(contrast(fit.color, fit.background)).toBeGreaterThanOrEqual(4.5)
}

test.describe('photo coming soon', () => {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
  ]) {
    test(`${viewport.name} caption fits the shared placeholder and leaves real photos alone`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/#/seattle/explore')
      await openList(page)
      const card = page.locator('.explore-card').filter({ has: page.locator('.no-photo') }).first()
      await expect(card).toBeVisible()
      await captionFits(page, '.explore-card .no-photo')
      const photo = page.locator('.explore-card').filter({ has: page.locator('img') }).first()
      await expect(photo.locator('img')).toBeVisible()
      await expect(photo.locator('.no-photo-caption')).toHaveCount(0)

      await page.goto('/#/seattle/place/altitude-sky-lounge')
      await expect(page.getByRole('heading', { name: 'ALTITUDE Sky Lounge' })).toBeVisible()
      await captionFits(page, 'main .no-photo')
      await expect(page.locator('main')).not.toContainText('No photo')
    })
  }
})
