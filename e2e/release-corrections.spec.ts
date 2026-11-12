import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const guides = JSON.parse(readFileSync(new URL('../src/content/guides.json', import.meta.url), 'utf8')) as {
  slug: string
  entries: { placeId: string }[]
}[]

const market = guides.find((guide) => guide.slug === 'pike-place-market')
const scores = Object.fromEntries((market?.entries ?? []).map((entry) => [entry.placeId, 8]))

async function rankFacts(page: import('@playwright/test').Page) {
  return page.locator('.rank-slot').evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    const line = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2
    const link = node.parentElement?.querySelector('a')
    return {
      text: (node.textContent || '').trim(),
      nowrap: style.whiteSpace,
      wraps: rect.height > line * 1.6,
      overflow: node.scrollWidth > node.clientWidth + 1,
      nameOffset: link && node.parentElement ? Math.round(link.getBoundingClientRect().x - node.parentElement.getBoundingClientRect().x) : null,
    }
  }))
}

test('featured bakeries, South Lake Union name, mismatched photos, and rank numbers', async ({ page }, info) => {
  test.setTimeout(150_000)
  const widths = info.project.name === 'webkit' ? [320, 390, 1440] : [320, 390, 1440]
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.addInitScript((payload) => {
    localStorage.setItem('gusto.house.v1', JSON.stringify(payload))
  }, scores)

  await page.setViewportSize({ width: info.project.name === 'chromium' ? 1440 : 390, height: info.project.name === 'chromium' ? 900 : 844 })
  await page.goto('/#/seattle')
  const featured = page.getByRole('region', { name: 'Featured guides' })
  await expect(featured.getByRole('link')).toHaveCount(6)
  await page.screenshot({ path: `/opt/cursor/artifacts/home-featured-${info.project.name}.png`, fullPage: false })
  await page.goto('/#/seattle/guide/best-bakeries')
  await expect(page).toHaveURL(/\/seattle\/guide\/best-bakeries$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Best Bakeries & Pastry' })).toBeVisible()

  await page.goto('/#/seattle/guides')
  await expect(page.getByRole('link', { name: 'South Lake Union (incl. Denny Triangle)' })).toHaveCount(0)
  const slu = page.getByRole('link', { name: /South Lake Union/ }).first()
  await expect(slu).toContainText('24 places')
  await expect(slu).toHaveAttribute('href', /\/seattle\/guide\/south-lake-union-incl-denny-triangle$/)
  await page.goto('/#/seattle/guide/south-lake-union-incl-denny-triangle')
  await expect(page.getByRole('heading', { level: 1, name: 'South Lake Union' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: /Denny Triangle/ })).toHaveCount(0)
  await expect(page.locator('#entry-2120')).toBeVisible()
  await expect(page).toHaveTitle(/South Lake Union · Gusto's Guide/)
  await page.screenshot({ path: `/opt/cursor/artifacts/slu-guide-${info.project.name}.png`, fullPage: false })

  await page.goto('/#/seattle/place/starbucks-coffee-company')
  await expect(page.getByText('Photo coming soon').first()).toBeVisible()
  await expect(page.locator('img[src*="starbucks-coffee-company"]')).toHaveCount(0)
  await expect(page.getByText('bragging rights to the first Starbucks')).toBeVisible()
  await expect(page.getByText('moved to this Pike Place shop in 1976')).toBeVisible()
  await expect(page.getByText('opened in 1971 on Western Avenue')).toBeVisible()
  await page.screenshot({ path: `/opt/cursor/artifacts/starbucks-placeholder-${info.project.name}.png`, fullPage: false })

  await page.goto('/#/seattle/place/alibi-room')
  await expect(page.locator('img[src*="alibi-room-gusto-1"]')).toHaveCount(2)
  await expect(page.locator('img[src*="alibi-room-gusto-2"]').first()).toBeAttached()

  await page.goto('/#/seattle/guide/cheap-eats')
  await expect(page.locator('#entry-alibi-room')).toHaveCount(0)
  await page.goto('/#/seattle/guide/pike-place')
  await expect(page.locator('#entry-alibi-room')).toBeVisible()

  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 700 ? 700 : 900 })
    await page.goto('/#/seattle/guide/pike-place-market')
    const slots = page.locator('.rank-slot')
    await expect(slots.first()).toHaveText('1')
    const facts = await rankFacts(page)
    const wanted = ['1', '9', '10', '11', '12', '25']
    for (const text of wanted) {
      const fact = facts.find((item) => item.text === text)
      expect(fact, `rank ${text} at ${width}`).toBeTruthy()
      expect(fact?.nowrap).toBe('nowrap')
      expect(fact?.wraps, `rank ${text} wrapped at ${width}`).toBe(false)
      expect(fact?.overflow, `rank ${text} overflowed at ${width}`).toBe(false)
    }
    const xs = facts.filter((item) => wanted.includes(item.text)).map((item) => item.nameOffset)
    expect(new Set(xs).size, `names align at ${width}: ${xs.join(',')}`).toBe(1)
    if (width === 390) {
      await slots.nth(10).evaluate((node) => node.scrollIntoView({ block: 'center' }))
      await page.screenshot({ path: `/opt/cursor/artifacts/ranks-${info.project.name}-390.png`, fullPage: false })
    }
    const hundred = await slots.first().evaluate((node) => {
      const copy = node.cloneNode(true)
      if (!(copy instanceof HTMLElement) || !node.parentElement) return { wraps: true, overflow: true }
      copy.textContent = '100'
      node.parentElement.appendChild(copy)
      const style = getComputedStyle(copy)
      const rect = copy.getBoundingClientRect()
      const line = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize)
      const result = { wraps: rect.height > line * 1.6, overflow: copy.scrollWidth > copy.clientWidth + 1 }
      copy.remove()
      return result
    })
    expect(hundred.wraps).toBe(false)
    expect(hundred.overflow).toBe(false)
  }
})

const SCORE_COLORS = {
  best: 'rgb(15, 107, 40)',
  great: 'rgb(56, 186, 70)',
  good: 'rgb(183, 227, 154)',
  fine: 'rgb(231, 178, 60)',
  skip: 'rgb(255, 83, 48)',
} as const

test('Best Breakfast includes Biscuit Bitch and score bands stay readable', async ({ page }, info) => {
  test.setTimeout(120_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.addInitScript(() => {
    localStorage.setItem('gusto.house.v1', JSON.stringify({
      'biscuit-bitch': 7.7,
      'il-bistro': 8.4,
      matsu: 8.5,
      'stampede-cocktail-club': 9.2,
      'the-doctor-s-office': 5.4,
      'seattle-biscuit-company': 6.8,
      'tilikum-place-cafe': 7.9,
      'geraldine-s-counter': 6.6,
    }))
  })

  await page.goto('/#/seattle/guides')
  const breakfast = page.getByRole('link', { name: /Best Breakfast/ }).first()
  await expect(breakfast).toContainText('19 places')
  await page.goto('/#/seattle/guide/breakfast-before-9')
  await expect(page.getByRole('heading', { level: 1, name: 'Best Breakfast' })).toBeVisible()
  const biscuit = page.locator('#entry-biscuit-bitch').first()
  await expect(biscuit.getByRole('link', { name: 'Biscuit Bitch', exact: true }).first()).toBeVisible()
  await expect(biscuit.locator('.score-badge').first()).toHaveClass(/tone-good/)
  await page.screenshot({ path: `/opt/cursor/artifacts/breakfast-biscuit-${info.project.name}.png`, fullPage: false })

  const samples = [
    ['biscuit-bitch', 'good', '7.7', 'Good'],
    ['tilikum-place-cafe', 'good', '7.9', 'Good'],
    ['seattle-biscuit-company', 'fine', '6.8', "It's fine"],
    ['geraldine-s-counter', 'fine', '6.6', "It's fine"],
    ['il-bistro', 'great', '8.4', 'Great'],
    ['matsu', 'great', '8.5', 'Great'],
    ['stampede-cocktail-club', 'best', '9.2', 'Best of the best'],
    ['the-doctor-s-office', 'skip', '5.4', 'Skip'],
  ] as const

  for (const [id, tone, score, label] of samples) {
    await page.goto(`/#/seattle/place/${id}`)
    const badge = page.locator('.score-badge').first()
    await expect(badge).toHaveClass(new RegExp(`tone-${tone}`))
    await expect(badge).toHaveAttribute('aria-label', `Gusto's Score ${score}, ${label}`)
    await expect(badge.locator('strong')).toHaveText(score)
    const paint = await badge.evaluate((node) => {
      const style = getComputedStyle(node)
      return { background: style.backgroundColor, color: style.color }
    })
    expect(paint.background).toBe(SCORE_COLORS[tone])
    if (tone === 'good' || tone === 'fine') expect(paint.color).toBe('rgb(24, 24, 24)')
    if (tone === 'best') expect(paint.color).toBe('rgb(255, 250, 243)')
  }

  const widths = info.project.name === 'webkit' ? [390] : [1440, 390]
  for (const width of widths) {
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
  await page.goto('/#/seattle/explore')
  const listButton = page.getByRole('button', { name: 'List', exact: true })
  if (await listButton.isVisible()) await listButton.click()
  const filtersButton = page.getByRole('button', { name: 'Filters', exact: true })
  if (await filtersButton.isVisible()) await filtersButton.click()
  const scoreFilter = page.getByRole('button', { name: /Gusto's Score/ })
  await expect(scoreFilter).toBeVisible()
  await scoreFilter.click()
  await page.getByRole('option', { name: 'Good', exact: true }).click()
  const card = page.locator('#explore-biscuit-bitch')
  await expect(card).toBeVisible()
  const mapBadge = card.locator('.score-badge')
  await expect(mapBadge).toHaveClass(/tone-good/)
  await expect(mapBadge).toContainText('7.7')
  const mapPaint = await mapBadge.evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    color: getComputedStyle(node).color,
  }))
  expect(mapPaint).toEqual({ background: SCORE_COLORS.good, color: 'rgb(24, 24, 24)' })
  await scoreFilter.click()
  await page.getByRole('option', { name: "It's fine", exact: true }).click()
  const fineCard = page.locator('#explore-seattle-biscuit-company')
  await expect(fineCard).toBeVisible()
  const finePaint = await fineCard.locator('.score-badge').evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    color: getComputedStyle(node).color,
  }))
  expect(finePaint).toEqual({ background: SCORE_COLORS.fine, color: 'rgb(24, 24, 24)' })
  await page.screenshot({ path: `/opt/cursor/artifacts/score-bands-explore-${info.project.name}-${width}.png`, fullPage: false })
  }
})

test('Pike Place Starbucks description names the first store and the 1976 move', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.goto('/#/seattle/place/starbucks-coffee-company')
  await expect(page.getByRole('heading', { level: 1, name: 'Starbucks Coffee Company' })).toBeVisible()
  await expect(page.locator('.photo-expand')).toHaveText('1 / 2')
  await expect(page.locator('.photo-frame img').first()).toHaveAttribute('src', /starbucks-coffee-company-gusto-1/)
  const description = page.getByText('bragging rights to the first Starbucks')
  await expect(description).toBeVisible()
  await expect(description).toContainText('opened in 1971 on Western Avenue')
  await expect(description).toContainText('moved to this Pike Place shop in 1976')
  await expect(description).not.toContainText('opened in 1971 at 1912')
  await page.goto('/#/seattle/guide/pike-place')
  const entry = page.locator('#entry-starbucks-coffee-company').first()
  await expect(entry.getByText('bragging rights to the first Starbucks')).toBeVisible()
  await expect(entry.getByText('moved to this Pike Place shop in 1976')).toBeVisible()
  await page.goto('/#/seattle/guide/best-coffee')
  await expect(page.locator('#entry-starbucks-coffee-company').first().getByText('the first Starbucks')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/seattle/place/starbucks-coffee-company')
  await expect(page.getByText('moved to this Pike Place shop in 1976')).toBeVisible()
  await expect(page.locator('.photo-expand')).toHaveText('1 / 2')
  await expect(page.locator('.photo-frame img').first()).toHaveAttribute('src', /starbucks-coffee-company-gusto-1/)
})

test('a warm cache of the sideways Taurus photo does not win', async ({ page }) => {
  const oldFiles = [
    '/photos/taurus-ox.jpg',
    '/photos/taurus-ox.480.jpg',
    '/photos/taurus-ox.960.jpg',
    '/photos/taurus-ox.200.webp',
    '/photos/taurus-ox.400.webp',
    '/photos/taurus-ox.720.webp',
    '/photos/taurus-ox.960.webp',
    '/photos/taurus-ox.200.avif',
    '/photos/taurus-ox.400.avif',
    '/photos/taurus-ox.720.avif',
    '/photos/taurus-ox.960.avif',
  ]
  const uprightSet = [480, 960, 1200].map((width) => (width === 1200 ? `/photos/taurus-ox-upright.jpg ${width}w` : `/photos/taurus-ox-upright.${width}.jpg ${width}w`)).join(', ')
  const server = createServer((req, res) => {
    const path = (req.url || '/').split('?')[0]
    if (path === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      res.end(`<!doctype html><img id="hero" alt="Taurus Ox" src="/photos/taurus-ox-upright.jpg" srcset="${uprightSet}" sizes="100vw">`)
      return
    }
    if (!path.startsWith('/photos/taurus-ox')) {
      res.writeHead(404)
      res.end()
      return
    }
    const body = readFileSync(new URL(`../public${path}`, import.meta.url))
    const type = path.endsWith('.webp') ? 'image/webp' : path.endsWith('.avif') ? 'image/avif' : 'image/jpeg'
    res.writeHead(200, { 'content-type': type, 'cache-control': 'public, max-age=31536000', 'content-length': body.length })
    res.end(body)
  })
  await new Promise<void>((resolve) => server.listen(4187, '127.0.0.1', resolve))
  try {
    for (const url of oldFiles) {
      const response = await page.goto(`http://127.0.0.1:4187${url}`)
      expect(response?.ok(), url).toBeTruthy()
      expect(response?.headers()['cache-control']).toContain('max-age=31536000')
    }
    const cached = await page.evaluate(async (urls) => {
      const out = []
      for (const url of urls) {
        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(true)
          img.onerror = () => reject(new Error(url))
          img.src = url
        })
        const timing = performance.getEntriesByType('resource').filter((entry) => entry.name.endsWith(url)).at(-1)
        out.push({ url, w: img.naturalWidth, h: img.naturalHeight, transfer: timing && 'transferSize' in timing ? timing.transferSize : -1 })
      }
      return out
    }, oldFiles)
    expect(cached.every((item) => item.w > item.h), JSON.stringify(cached)).toBe(true)
    expect(cached.every((item) => item.transfer === 0), JSON.stringify(cached)).toBe(true)
    const requested: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/photos/taurus-ox')) requested.push(new URL(request.url()).pathname)
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('http://127.0.0.1:4187/')
    const hero = page.locator('#hero')
    await expect(hero).toBeVisible()
    const shown = await hero.evaluate((node) => {
      const img = node as HTMLImageElement
      return { src: img.currentSrc, w: img.naturalWidth, h: img.naturalHeight }
    })
    expect(shown.src).toContain('/photos/taurus-ox-upright')
    expect(shown.h).toBeGreaterThan(shown.w)
    expect(requested.some((path) => path.includes('/photos/taurus-ox-upright'))).toBe(true)
    expect(requested.some((path) => /\/photos\/taurus-ox\.(?!upright)/.test(path))).toBe(false)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/seattle/place/taurus-ox')
  const appHero = page.locator('.photo-stage img').first()
  await expect(appHero).toBeVisible()
  const appShown = await appHero.evaluate((node) => ({ src: (node as HTMLImageElement).currentSrc, w: (node as HTMLImageElement).naturalWidth, h: (node as HTMLImageElement).naturalHeight }))
  expect(appShown.src).toContain('/photos/taurus-ox-gusto-1')
  await page.getByRole('tab', { name: 'Photo 4 of 4' }).click()
  const uprightHero = page.locator('.photo-stage img').first()
  await expect.poll(() => uprightHero.evaluate((node) => (node as HTMLImageElement).currentSrc || node.getAttribute('src') || '')).toContain('/photos/taurus-ox-upright')
  const uprightShot = await uprightHero.evaluate((node) => ({ src: (node as HTMLImageElement).currentSrc || node.getAttribute('src') || '', w: (node as HTMLImageElement).naturalWidth, h: (node as HTMLImageElement).naturalHeight }))
  expect(uprightShot.h).toBeGreaterThan(uprightShot.w)
  await page.locator('.photo-stage').screenshot({ path: '/opt/cursor/artifacts/taurus-ox-cachebust-1440.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  const phone = page.locator('.photo-stage img').first()
  await expect(phone).toBeVisible()
  await expect.poll(() => phone.evaluate((node) => (node as HTMLImageElement).currentSrc || node.getAttribute('src') || '')).toContain('/photos/taurus-ox-gusto-1')
  await page.getByRole('tab', { name: 'Photo 4 of 4' }).evaluate((node) => (node as HTMLButtonElement).click())
  const phoneHero = page.locator('.photo-stage img').first()
  await expect.poll(() => phoneHero.evaluate((node) => (node as HTMLImageElement).currentSrc || node.getAttribute('src') || '')).toContain('/photos/taurus-ox-upright')
  const phoneUpright = await phoneHero.evaluate((node) => ({ src: (node as HTMLImageElement).currentSrc || node.getAttribute('src') || '', w: (node as HTMLImageElement).naturalWidth, h: (node as HTMLImageElement).naturalHeight }))
  expect(phoneUpright.h).toBeGreaterThan(phoneUpright.w)
  await page.locator('.photo-stage').screenshot({ path: '/opt/cursor/artifacts/taurus-ox-cachebust-390.png' })
})

test('price chips filter guides, the map, and search', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  for (const [width, height] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width, height })
    await page.goto('/#/seattle/guide/breakfast-before-9')
    if (width < 700) await page.getByRole('button', { name: /^Filters/ }).click()
    const prices = (width < 700 ? page.locator('.bottom-sheet') : page).getByRole('group', { name: 'Price' })
    await expect(prices.getByRole('button', { name: '$', exact: true })).toBeVisible()
    await expect(prices.getByRole('button', { name: '$$$$', exact: true })).toBeVisible()
    await expect(prices.getByRole('button', { name: 'No price' })).toHaveCount(0)
    const tally = page.locator('p.mt-2.text-sm.font-bold')
    const before = await tally.textContent()
    const doubles = prices.getByRole('button', { name: '$$', exact: true })
    await doubles.click()
    await expect(doubles).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('#entry-biscuit-bitch').first()).toBeVisible()
    await expect(tally).not.toHaveText(before ?? '')
    await page.screenshot({ path: `/opt/cursor/artifacts/price-filter-guide-${width}.png`, fullPage: false })
    await doubles.click()
    await expect(doubles).toHaveAttribute('aria-pressed', 'false')
    await expect(tally).toHaveText(before ?? '')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
    expect(overflow).toBe(true)
    if (width < 700) await page.getByRole('button', { name: 'Close filters' }).click()
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/seattle/explore')
  const tally = page.locator('.explore-bar .font-serif')
  const all = await tally.textContent()
  await page.getByRole('group', { name: 'Price' }).getByRole('button', { name: '$$$$', exact: true }).click()
  await expect(tally).not.toHaveText(all ?? '')
  await page.getByRole('group', { name: 'Price' }).getByRole('button', { name: '$$$$', exact: true }).click()
  await expect(tally).toHaveText(all ?? '')
  await page.screenshot({ path: '/opt/cursor/artifacts/price-filter-explore-1440.png', fullPage: false })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/nyc/explore')
  const list = page.getByRole('button', { name: 'List', exact: true })
  if (await list.isVisible()) await list.click()
  const filters = page.getByRole('button', { name: 'Filters', exact: true })
  if (await filters.isVisible()) await filters.click()
  await expect(page.getByRole('button', { name: 'No price' })).toBeVisible()
  await page.getByRole('group', { name: 'Price' }).getByRole('button', { name: '$', exact: true }).click()
  await expect(page.locator('#explore-square-diner')).toBeVisible()
  await expect(page.getByText('Nothing in this view.')).toHaveCount(0)
  await page.screenshot({ path: '/opt/cursor/artifacts/price-filter-nyc-390.png', fullPage: false })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/seattle')
  await page.getByRole('textbox', { name: 'Search guides and places' }).fill('pizza')
  await expect(page.getByRole('group', { name: 'Price' })).toBeVisible()
  await page.getByRole('group', { name: 'Price' }).getByRole('button', { name: '$$$$', exact: true }).click()
  await expect(page.getByText('No places at that price.')).toBeVisible()
  await page.screenshot({ path: '/opt/cursor/artifacts/price-filter-search-1440.png', fullPage: false })
})

test('sideways storefronts are upright and an empty guide can be cleared', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  for (const [id, width, height] of [['2120', 1440, 900], ['honeyhole-sandwiches', 390, 844], ['maiz', 320, 700]] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(`/#/seattle/place/${id}`)
    const hero = page.locator('.photo-stage img').first()
    await expect(hero).toBeVisible()
    const box = await hero.evaluate((node) => {
      const img = node as HTMLImageElement
      return { src: img.currentSrc, w: img.naturalWidth, h: img.naturalHeight }
    })
    expect(box.src).toContain(`/${id}-upright`)
    expect(box.h).toBeGreaterThan(box.w)
    await page.locator('.photo-stage').screenshot({ path: `/opt/cursor/artifacts/upright-${id}-${width}.png` })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/seattle/guide/breakfast-before-9')
  await page.getByRole('button', { name: /^Filters/ }).click()
  await page.locator('.bottom-sheet').getByRole('button', { name: '$$$$', exact: true }).click()
  const clear = page.locator('.bottom-sheet').getByRole('button', { name: 'Clear filters' })
  await expect(clear).toBeVisible()
  await clear.click()
  await expect(page.locator('p.mt-2.text-sm.font-bold')).toHaveText('19 places')
  await page.screenshot({ path: '/opt/cursor/artifacts/guide-clear-filters-390.png', fullPage: false })
})
