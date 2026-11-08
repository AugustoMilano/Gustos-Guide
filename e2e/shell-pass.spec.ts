import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, name: string) {
  const direct = page.getByRole('button', { name: 'Sign in', exact: true })
  if (!(await direct.isVisible().catch(() => false))) await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const form = page.locator('form[data-auth]')
  test.skip((await form.getAttribute('data-auth')) !== 'local', 'Local sign-in is not on this build.')
  await page.getByLabel('Name').fill(name)
  await page.locator('form[data-auth]').evaluate((form) => (form as HTMLFormElement).requestSubmit())
  await expect(form).toBeHidden()
}

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

test('quick score count, unscored pill, and the shorter header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/seattle')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await signIn(page, 'Augusto Milano')
  const bar = page.locator('.header-bar')
  const overflow = await bar.evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  const primary = page.getByRole('navigation', { name: 'Primary' })
  await expect(primary.getByRole('link', { name: 'Explore' })).toBeVisible()
  await expect(primary.getByRole('link', { name: 'Feed' })).toHaveCount(0)
  await expect(primary.getByRole('link', { name: 'Quick score' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Menu' }).click()
  const menu = page.getByRole('navigation', { name: 'Menu' })
  await expect(menu.getByRole('link', { name: 'Quick score' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await page.goto('/#/seattle/score/quick')
  const intro = page.locator('#main > p').filter({ hasText: /^\d+ of \d+ scored\.$/ })
  await expect(intro).toHaveText(/^\d+ of \d+ scored\.$/)
  const unscored = page.getByRole('button', { name: 'Unscored only' })
  await expect(unscored).toHaveAttribute('aria-pressed', 'true')
  const colors = await unscored.evaluate((el) => {
    const style = getComputedStyle(el)
    return { color: style.color, background: style.backgroundColor, height: el.getBoundingClientRect().height }
  })
  expect(colors.height).toBeGreaterThanOrEqual(44)
  expect(contrast(colors.color, colors.background)).toBeGreaterThanOrEqual(4.5)
  const mark = await unscored.evaluate((el) => getComputedStyle(el, '::before').content)
  expect(mark).not.toBe('none')
  await unscored.evaluate((el) => (el as HTMLButtonElement).click())
  const off = await unscored.evaluate((el) => {
    const style = getComputedStyle(el)
    return { color: style.color, background: style.backgroundColor }
  })
  expect(contrast(off.color, off.background)).toBeGreaterThanOrEqual(4.5)
})

test('a missing photo uses the neutral mark and a real photo stays a photo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/seattle/explore')
  await expect(page.locator('.explore-card .no-photo').first()).toBeVisible()
  await expect(page.locator('.explore-card img').first()).toBeVisible()
  const mark = page.locator('.explore-card .no-photo').first()
  await expect(mark).toHaveText('Photo coming soon')
  await expect(mark.locator('svg')).toHaveAttribute('aria-hidden', 'true')
})
