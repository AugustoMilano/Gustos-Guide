import { expect, test, type Page } from '@playwright/test'

async function showPhoto(page: Page, index: number) {
  await page.waitForSelector('.photo-thumb')
  await page.evaluate((i) => {
    const thumb = document.querySelectorAll<HTMLButtonElement>('.photo-thumb')[i]
    thumb?.click()
  }, index)
  await expect(page.locator('.photo-stage img.place-art')).toHaveClass(/is-portrait/)
}

async function objectPosition(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((node) => getComputedStyle(node).objectPosition)
}

async function shoot(page: Page, selector: string, name: string) {
  await page.evaluate((sel) => {
    const img = document.querySelector(sel)
    const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0
    if (!img) return
    const y = img.getBoundingClientRect().top + window.scrollY - header - 12
    window.scrollTo(0, Math.max(0, y))
  }, selector)
  const box = await page.locator(selector).first().boundingBox()
  if (!box) return
  const vp = page.viewportSize() ?? { width: 390, height: 844 }
  const clip = {
    x: Math.max(0, box.x),
    y: Math.max(0, box.y),
    width: Math.max(1, Math.min(box.width, vp.width - Math.max(0, box.x))),
    height: Math.max(1, Math.min(box.height, vp.height - Math.max(0, box.y))),
  }
  await page.screenshot({ path: `/opt/cursor/artifacts/${name}.png`, clip, animations: 'disabled' })
}

test('portrait heroes crop from the center, and the Piroshky pastry stays low', async ({ page }, info) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  const phone = info.project.name === 'webkit'
  await page.setViewportSize({ width: phone ? 390 : 1440, height: phone ? 844 : 900 })
  const kind = info.project.name

  await page.goto('/#/eastside/place/deru-market')
  await expect(page.getByRole('heading', { name: 'Deru Market' })).toBeVisible()
  const hero = '.photo-stage img.place-art'
  for (const [index, label] of [[0, 'pasta'], [2, 'soup'], [3, 'sandwich']] as const) {
    await showPhoto(page, index)
    await expect.poll(() => objectPosition(page, hero)).toBe('50% 50%')
    await shoot(page, hero, `crop-after-deru-${label}-${kind}`)
  }

  await page.goto('/#/seattle/place/beecher-s-handmade-cheese')
  await showPhoto(page, 0)
  await expect.poll(() => objectPosition(page, hero)).toBe('50% 50%')
  await shoot(page, hero, `crop-after-beecher-${kind}`)

  await page.goto('/#/seattle/place/piroshky-piroshky')
  await showPhoto(page, 0)
  await expect.poll(() => objectPosition(page, hero)).toBe('50% 68%')

  await page.goto('/#/eastside/guide/best-breakfast-on-the-east-side')
  const compact = 'a[href="#entry-deru-market"] img'
  await expect(page.locator(compact).first()).toHaveClass(/is-portrait/)
  await expect.poll(() => objectPosition(page, compact)).toBe('50% 50%')
  const guide = '#entry-deru-market img'
  await page.evaluate(() => document.getElementById('entry-deru-market')?.scrollIntoView())
  await expect(page.locator(guide).first()).toHaveClass(/is-portrait/)
  await expect.poll(() => objectPosition(page, guide)).toBe('50% 50%')
  await shoot(page, guide, `crop-after-deru-guide-${kind}`)
})
