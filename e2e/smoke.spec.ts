import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'

const catalog = JSON.parse(readFileSync(new URL('../src/content/index.json', import.meta.url), 'utf8')) as {
  guides: { slug: string; group: string }[]
  places: { id: string; name: string }[]
}

const DIVE = [
  'the-5-point-cafe',
  'blue-moon',
  'white-horse-tavern',
  'the-roanoke',
  'pacific-inn-pub',
  'loretta-s-northwesterner',
  'bait-shop',
  'king-s-hardware',
  'add-a-ball',
  'unicorn',
  'flatstick-pub',
  'rhein-haus',
  'ozzie-s',
  'marco-polo-bar-grill',
  'finn-maccools',
]

const EXTRA = catalog.places.map((place) => place.id).filter((id) => !DIVE.includes(id)).slice(0, 28)
const PLACES = [...DIVE, ...EXTRA]
const GUIDES = catalog.guides.map((guide) => guide.slug)
const NEIGHBORHOODS = catalog.guides.filter((guide) => guide.group === 'Neighborhoods').map((guide) => guide.slug)

const STATIC = [
  '/',
  '/guides',
  '/explore',
  '/search',
  '/search?q=ramen',
  '/search?q=zzzznotaplace',
  '/search?q=Queen%20Anne',
  '/feed',
  '/plans',
  '/plans/wizard',
  '/plan/plan-friday',
  '/list/list-weeknight',
  '/join/not-a-real-token',
  '/rank',
  '/my',
  '/u/mina',
  '/no-such-page',
  '/place/not-on-the-list',
]

function chunks<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size))
  return groups
}

// Headless WebKit often never schedules requestAnimationFrame, so Playwright's
// stability check waits until timeout. The element is still the hit target.
async function tap(locator: Locator) {
  const browser = locator.page().context().browser()?.browserType().name()
  await locator.click(browser === 'webkit' ? { force: true } : undefined)
}

async function scrollTo(page: Page, top: number) {
  await page.evaluate((y) => {
    window.scrollTo(0, y)
    window.dispatchEvent(new Event('scroll'))
  }, top)
}

function watch(page: Page) {
  const issues: string[] = []
  page.on('pageerror', (error) => {
    const text = String(error)
    if (/ResizeObserver loop/.test(text)) return
    issues.push(`pageerror ${text.slice(0, 280)}`)
  })
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (/favicon|Download the React DevTools|ResizeObserver/.test(text)) return
    issues.push(`console ${text.slice(0, 280)}`)
  })
  page.on('response', (response) => {
    const url = response.url()
    if (!url.startsWith('http://127.0.0.1:4179')) return
    if (response.status() < 400) return
    issues.push(`http ${response.status()} ${url.replace('http://127.0.0.1:4179', '')}`)
  })
  return issues
}

async function look(page: Page, path: string): Promise<string[]> {
  return page.evaluate((route) => {
    const found: string[] = []
    const root = document.documentElement
    const overflow = root.scrollWidth - root.clientWidth
    if (overflow > 8) found.push(`${route} horizontal overflow ${overflow}px`)

    const header = document.querySelector('.site-header')
    const headerBottom = header?.getBoundingClientRect().bottom ?? 0
    const heading = document.querySelector('h1')
    if (heading && !heading.classList.contains('sr-only')) {
      const box = heading.getBoundingClientRect()
      if (box.height > 8 && box.top < headerBottom - 2 && box.bottom > headerBottom) {
        found.push(`${route} header covers the title`)
      }
    }

    const broken = [...document.images]
      .filter((img) => img.complete && img.naturalWidth === 0 && img.currentSrc && !img.currentSrc.startsWith('data:'))
      .slice(0, 4)
      .map((img) => img.currentSrc.replace(location.origin, ''))
    if (broken.length) found.push(`${route} broken images ${broken.join(', ')}`)

    const dead: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('*')) {
      if (dead.length >= 6) break
      if (el.closest('.leaflet-container, [aria-hidden="true"]')) continue
      const style = getComputedStyle(el)
      if (style.cursor !== 'pointer' || style.pointerEvents === 'none' || style.visibility === 'hidden' || style.display === 'none') continue
      const box = el.getBoundingClientRect()
      if (box.width < 8 || box.height < 8) continue
      if (el.closest('a, button, label, summary, input, select, textarea, [role="button"], [role="link"], [role="tab"]')) continue
      const name = (el.getAttribute('class') || el.tagName).toString().slice(0, 80)
      dead.push(name)
    }
    if (dead.length) found.push(`${route} looks clickable but is not: ${dead.join(' | ')}`)

    for (const el of document.querySelectorAll<HTMLElement>('.btn, .chip, .sort-chip, .glass-icon, .back-to-top, .leaflet-bar a, .map-zoom button')) {
      if (el.closest('.leaflet-control-attribution')) continue
      const box = el.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) continue
      if (box.height < 44 || (el.classList.contains('glass-icon') && box.width < 44)) {
        const label = (el.getAttribute('aria-label') || el.textContent || el.className).trim().slice(0, 40)
        found.push(`${route} tap target ${Math.round(box.width)}x${Math.round(box.height)} ${label}`)
        if (found.length > 12) break
      }
    }

    for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      if (link.closest('.leaflet-container')) continue
      const href = link.getAttribute('href') || ''
      if (href === '#' || href === '') found.push(`${route} empty link ${link.textContent?.trim().slice(0, 40)}`)
    }
    return found
  }, path)
}

async function openRoute(page: Page, issues: string[], path: string) {
  const before = issues.length
  await page.goto(`/#${path}`, { waitUntil: 'domcontentloaded' })
  await page.locator('main, #main').first().waitFor({ state: 'attached' })
  await page.waitForTimeout(200)
  const visual = await look(page, path)
  issues.push(...visual)
  const fresh = issues.slice(before)
  expect(fresh, fresh.join('\n')).toEqual([])
}

test.describe('routes', () => {
  test('static pages', async ({ page }) => {
    const issues = watch(page)
    for (const path of STATIC) await openRoute(page, issues, path)
  })

  for (const [index, group] of chunks(GUIDES, 4).entries()) {
    test(`guides ${index + 1}`, async ({ page }) => {
      const issues = watch(page)
      for (const slug of group) await openRoute(page, issues, `/guide/${slug}`)
    })
  }

  for (const [index, group] of chunks(PLACES, 5).entries()) {
    test(`places ${index + 1}`, async ({ page }) => {
      const issues = watch(page)
      for (const id of group) await openRoute(page, issues, `/place/${id}`)
    })
  }

  test('neighborhood guides are in the guide set', () => {
    expect(NEIGHBORHOODS.length).toBeGreaterThan(10)
    expect(GUIDES.length).toBe(50)
    expect(PLACES.length).toBeGreaterThanOrEqual(40)
  })
})

test.describe('controls', () => {
  test('home header, keyboard, scroll, and back to top', async ({ page }) => {
    const issues = watch(page)
    await page.goto('/#/', { waitUntil: 'domcontentloaded' })
    await page.locator('h1').waitFor()
    await expect(page.locator('.site-header')).toHaveClass(/on-hero/)
    const header = await page.evaluate(() => {
      const bar = document.querySelector('.site-header')
      if (!bar) return null
      const style = getComputedStyle(bar)
      const word = getComputedStyle(bar.querySelector('a')!)
      return { background: style.backgroundColor, color: word.color }
    })
    expect(header?.background ?? '').toMatch(/rgba?\(\s*20,\s*31,\s*77/)
    expect(header?.color ?? '').toMatch(/rgba?\(\s*255,\s*250,\s*243/)

    await page.keyboard.press('Tab')
    await expect(page.locator('.skip')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main')).toBeFocused()

    await scrollTo(page, 1100)
    await expect(page.locator('.back-to-top')).toBeVisible()
    await tap(page.locator('.back-to-top'))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(40)

    await scrollTo(page, 900)
    await page.evaluate(() => {
      const link = document.querySelector<HTMLAnchorElement>('a[href="#/guides"]')
      link?.click()
    })
    await expect(page).toHaveURL(/#\/guides/)
    await page.goBack()
    await expect(page).toHaveURL(/#\/$|#\/$|#$/)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400)
    expect(issues, issues.join('\n')).toEqual([])
  })

  test('guide share, sort, filters, and to-go', async ({ page }, info) => {
    const issues = watch(page)
    await page.goto('/#/guide/fun-dive-bars', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: /Fun & Dive Bars/ })).toBeVisible()
    const share = page.getByRole('button', { name: 'Share' }).first()
    await tap(share)
    await expect(share).toHaveText(/Copied|Copy the link|Share/)
    const sort = page.getByRole('button', { name: "Gusto's Score" })
    const box = await sort.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    await tap(sort)
    await expect(sort).toHaveAttribute('aria-pressed', 'true')

    if (info.project.name === 'webkit') {
      await tap(page.getByRole('button', { name: /Filters/ }))
      await tap(page.getByRole('button', { name: /Show/ }))
      await tap(page.getByRole('button', { name: 'Map' }))
      await expect(page.locator('.leaflet-container')).toBeVisible()
      await tap(page.getByRole('button', { name: 'List' }))
    }

    const photo = page.locator('a[href="#/place/the-5-point-cafe"]').first()
    await expect(photo).toBeVisible()
    await tap(page.getByRole('button', { name: 'To go' }).first())
    await expect(page.getByRole('dialog', { name: 'Sign in' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Sign in' })).toHaveCount(0)
    expect(issues, issues.join('\n')).toEqual([])
  })

  test('place directions, yelp, share, and photo prompt', async ({ page }) => {
    const issues = watch(page)
    await page.goto('/#/place/canlis', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Canlis' })).toBeVisible()
    const directions = page.getByRole('link', { name: 'Directions' }).first()
    await expect(directions).toHaveAttribute('href', /google\.com\/maps\/dir|maps\.apple\.com/)
    await expect(page.getByRole('link', { name: /Open in (Google|Apple) Maps/ }).first()).toBeVisible()
    const yelp = page.getByRole('link', { name: 'Yelp' }).first()
    if (await yelp.count()) await expect(yelp).toHaveAttribute('href', /yelp\.com\/biz\//)
    await tap(page.getByRole('button', { name: 'Share' }))
    await tap(page.getByRole('button', { name: 'Sign in to add a photo' }))
    await expect(page.getByRole('dialog', { name: 'Sign in' })).toBeVisible()
    await page.getByLabel('Name').fill('QA')
    await tap(page.getByRole('dialog', { name: 'Sign in' }).getByRole('button', { name: 'Sign in' }))
    await expect(page.getByRole('dialog', { name: 'Sign in' })).toHaveCount(0)
    await expect(page.getByText('Mark Been to add a photo')).toBeVisible()
    expect(issues, issues.join('\n')).toEqual([])
  })

  test('missing page search, empty search, and rank sign-in', async ({ page }) => {
    const issues = watch(page)
    await page.goto('/#/no-such-page', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'That page is not on the menu.' })).toBeVisible()
    await page.locator('#missing-search').fill('Pizza')
    await tap(page.getByRole('button', { name: 'Search' }))
    await expect(page).toHaveURL(/#\/search\?q=Pizza/)
    await expect(page.getByRole('heading', { name: 'Search Seattle' })).toBeVisible()

    await page.goto('/#/search?q=zzzznotaplace')
    await expect(page.getByText(/Nothing matches/)).toBeVisible()
    await tap(page.getByRole('link', { name: 'Browse the guides' }))
    await expect(page).toHaveURL(/#\/guides/)

    await page.goto('/#/rank')
    await tap(page.getByRole('button', { name: 'Loved' }).first())
    await expect(page.getByRole('dialog', { name: 'Sign in' })).toBeVisible()
    await page.keyboard.press('Escape')

    await page.goto('/#/my')
    await tap(page.getByRole('button', { name: 'Sign in' }))
    await expect(page.getByRole('dialog', { name: 'Sign in' })).toBeVisible()
    expect(issues, issues.join('\n')).toEqual([])
  })

  test('menu, alerts, and explore pins', async ({ page }, info) => {
    const issues = watch(page)
    await page.goto('/#/', { waitUntil: 'domcontentloaded' })
    if (info.project.name === 'webkit') {
      await tap(page.getByRole('button', { name: 'Menu' }))
      await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('navigation', { name: 'Mobile' })).toHaveCount(0)
      await tap(page.getByRole('button', { name: /Notifications/ }).first())
    } else {
      await tap(page.getByRole('button', { name: 'Notifications' }))
    }
    await expect(page.getByRole('region', { name: 'Notifications' })).toBeVisible()
    await tap(page.getByRole('button', { name: 'Close notifications' }))
    await expect(page.getByRole('region', { name: 'Notifications' })).toHaveCount(0)

    await page.goto('/#/explore', { waitUntil: 'domcontentloaded' })
    await page.locator('.leaflet-container').waitFor()
    await tap(page.getByRole('button', { name: 'Zoom in' }))
    await page.waitForTimeout(400)
    await tap(page.getByRole('button', { name: 'Zoom out' }))
    await page.waitForTimeout(800)
    const opened = await page.evaluate(() => {
      const pins = [...document.querySelectorAll<HTMLElement>('.gusto-pin-wrap, .gusto-cluster')]
      const target = pins.find((el) => {
        const box = el.getBoundingClientRect()
        return box.width > 0 && box.y > 160 && box.y < 520 && box.x > 40
      }) ?? pins[0]
      target?.click()
      return Boolean(target)
    })
    expect(opened).toBeTruthy()
    await page.waitForTimeout(700)
    const popup = page.locator('.leaflet-popup')
    if (await popup.count()) {
      await expect(popup.getByRole('link', { name: /Open / }).first()).toBeVisible()
    } else {
      await expect(page.locator('.gusto-pin-wrap, .gusto-cluster').first()).toBeVisible()
    }
    if (info.project.name === 'webkit') await tap(page.getByRole('button', { name: 'List' }))
    const card = page.locator('.explore-card a').first()
    await tap(card)
    await expect(page).toHaveURL(/#\/place\//)
    expect(issues, issues.join('\n')).toEqual([])
  })
})
