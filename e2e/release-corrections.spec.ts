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
