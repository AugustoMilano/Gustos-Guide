import { expect, test, type Browser, type Page } from '@playwright/test'

async function openExplore(page: Page) {
  await page.goto('/#/explore', { waitUntil: 'domcontentloaded' })
  await page.locator('.leaflet-container').waitFor()
  await page.locator('.explore-list').waitFor()
}

async function metrics(page: Page) {
  return page.evaluate(() => {
    const box = (sel: string) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { top: b.top, bottom: b.bottom, height: b.height, width: b.width }
    }
    const header = box('.site-header')
    const sheet = box('.explore-list')
    const dock = box('.lg-dock')
    const count = box('.explore-bar .font-serif')
    const chips = box('.explore-chips')
    const targets = [...document.querySelectorAll<HTMLElement>('.city-switch-btn, .region-back, .explore-chips .glass-chip')].map((el) => {
      const b = el.getBoundingClientRect()
      return { t: (el.textContent || '').trim().slice(0, 16), h: b.height }
    })
    const overlap = Boolean(count && chips && count.bottom > chips.top + 1 && chips.bottom > count.top + 1 && count.right > chips.left + 1 && chips.right > count.left + 1)
    return {
      route: document.documentElement.dataset.route,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      header: header?.height ?? 0,
      mapBand: header && sheet ? sheet.top - header.bottom : 0,
      sheetTop: sheet?.top ?? 0,
      headerBottom: header?.bottom ?? 0,
      dockTop: dock?.top ?? window.innerHeight,
      chipsBottom: chips?.bottom ?? 0,
      overlap,
      targets,
      transition: getComputedStyle(document.querySelector('.explore-list')!).transition,
    }
  })
}

test.describe('short phone map', () => {
  test.use({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true })

  test('header folds on explore and the map stays usable', async ({ page }) => {
    await openExplore(page)
    const view = await metrics(page)
    expect(view.route).toBe('explore')
    expect(view.overflow).toBeLessThanOrEqual(8)
    expect(view.header).toBeLessThan(150)
    expect(view.mapBand).toBeGreaterThan(140)
    expect(view.sheetTop).toBeGreaterThanOrEqual(view.headerBottom - 1)
    expect(view.chipsBottom).toBeLessThanOrEqual(view.dockTop + 1)
    expect(view.overlap).toBe(false)
    for (const target of view.targets) expect(target.h).toBeGreaterThanOrEqual(44)
    const glint = page.locator('.city-switch-glint')
    await expect(glint).toHaveCount(1)
  })
})

test.describe('taller phones keep the stacked header', () => {
  test('390 and 430 do not fold the header', async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }]) {
      await page.setViewportSize(viewport)
      await openExplore(page)
      const view = await metrics(page)
      expect(view.header).toBeGreaterThan(160)
      expect(view.sheetTop).toBeGreaterThanOrEqual(view.headerBottom - 1)
      expect(view.overlap).toBe(false)
      expect(view.overflow).toBeLessThanOrEqual(8)
    }
  })
})

test.describe('desktop map', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('sidebar stays beside the map and there is no phone tab bar', async ({ page }) => {
    await openExplore(page)
    const dock = await page.locator('.lg-dock').evaluate((el) => getComputedStyle(el).display)
    expect(dock).toBe('none')
    const view = await metrics(page)
    expect(view.header).toBeLessThan(140)
    expect(view.overflow).toBeLessThanOrEqual(8)
    const sheet = await page.locator('.explore-list').evaluate((el) => getComputedStyle(el).position)
    expect(sheet).not.toBe('fixed')
  })
})

test.describe('place page clears the tab bar', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the end of a long place sits above the tab bar', async ({ page }) => {
    await page.goto('/#/place/canlis', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Canlis' })).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const end = await page.evaluate(() => {
      const dock = document.querySelector('.lg-dock')!.getBoundingClientRect().top
      const made = document.querySelector('.made-in')!.getBoundingClientRect()
      const terms = document.querySelector('a[href="/terms/"]')!.getBoundingClientRect()
      // The line itself sits in the content box, above the footer's bottom pad.
      const textBottom = made.top + 28
      return { dock, textBottom, termsBottom: terms.bottom }
    })
    expect(end.textBottom).toBeLessThanOrEqual(end.dock + 1)
    expect(end.termsBottom).toBeLessThanOrEqual(end.dock + 1)
  })
})

test.describe('map memory', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('Open now and the sheet stop survive a place and Back', async ({ page }) => {
    await openExplore(page)
    await page.getByRole('button', { name: 'Open now' }).click()
    await expect(page.getByRole('button', { name: 'Open now' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'List', exact: true }).click()
    await expect(page.locator('.map-sheet.is-full')).toHaveCount(1)
    await page.locator('.explore-card a').first().click({ force: true })
    await expect(page).toHaveURL(/\/place\//)
    await page.getByRole('button', { name: 'Back', exact: true }).click({ force: true })
    await expect(page).toHaveURL(/explore/)
    await expect(page.getByRole('button', { name: 'Open now' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.map-sheet.is-full')).toHaveCount(1)
  })
})

test.describe('desktop panel parity', () => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    test(`map controls at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await openExplore(page)
      const near = page.getByRole('button', { name: 'Near me' })
      const open = page.getByRole('button', { name: 'Open now' })
      await expect(near).toBeVisible()
      await expect(open).toBeVisible()
      const boxes = await Promise.all([near.boundingBox(), open.boundingBox()])
      for (const box of boxes) {
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(8)
      const position = await page.locator('.explore-list').evaluate((el) => getComputedStyle(el).position)
      expect(position).not.toBe('fixed')

      await near.focus()
      await expect(near).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(open).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(open).toHaveAttribute('aria-pressed', 'true')

      await page.waitForTimeout(1000)
      const pinBox = await page.evaluate(() => {
        const pins = [...document.querySelectorAll<HTMLElement>('.gusto-pin-wrap')]
        const hit = pins.find((el) => {
          const b = el.getBoundingClientRect()
          return b.width > 8 && b.top > 80 && b.left > 380 && b.bottom < window.innerHeight - 8
        })
        if (!hit) return null
        const b = hit.getBoundingClientRect()
        return { x: b.x + b.width / 2, y: b.y + 10 }
      })
      expect(pinBox).toBeTruthy()
      await page.mouse.click(pinBox!.x, pinBox!.y)
      if (await page.locator('.explore-card[aria-current="true"]').count() === 0) {
        await page.locator('.gusto-pin-wrap').first().click({ force: true })
      }
      await expect(page.locator('.explore-card').first()).toHaveAttribute('aria-current', 'true')

      await page.getByRole('button', { name: 'Zoom in' }).click()
      const area = page.locator('.search-area')
      await expect(area).toBeVisible()
      const hit = await area.evaluate((el) => {
        const b = el.getBoundingClientRect()
        const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
        return top === el || el.contains(top)
      })
      expect(hit).toBe(true)

      await page.locator('.explore-card a').first().click()
      await expect(page).toHaveURL(/\/place\//)
      await page.getByRole('button', { name: 'Back', exact: true }).click({ force: true })
      await expect(page).toHaveURL(/explore/)
      await expect(open).toHaveAttribute('aria-pressed', 'true')
      await expect(page.locator('.explore-card').first()).toHaveAttribute('aria-current', 'true')
    })
  }
})

async function sheetTransition(browser: Browser, reduced: boolean) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  await openExplore(page)
  const transition = await page.locator('.explore-list').evaluate((el) => getComputedStyle(el).transition)
  await context.close()
  return transition
}

test('sheet motion follows the reduced-motion setting', async ({ browser }) => {
  const reduced = await sheetTransition(browser, true)
  const full = await sheetTransition(browser, false)
  expect(reduced === 'none' || reduced.startsWith('none')).toBe(true)
  expect(full).toContain('transform')
})
