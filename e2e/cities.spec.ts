import { expect, test, type Locator, type Page } from '@playwright/test'

async function tap(locator: Locator) {
  const browser = locator.page().context().browser()?.browserType().name()
  await locator.click(browser === 'webkit' ? { force: true } : undefined)
}

function watch(page: Page) {
  const issues: string[] = []
  page.on('pageerror', (error) => {
    const text = String(error)
    if (/_map\.getZoom/.test(text)) return
    issues.push(text.slice(0, 240))
  })
  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon|React DevTools|ResizeObserver|_map\.getZoom/.test(message.text())) {
      issues.push(message.text().slice(0, 240))
    }
  })
  return issues
}

test('city picker, Seattle urls, and Los Angeles', async ({ page }) => {
  const issues = watch(page)
  await page.goto('/#/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Where are you eating?')
  await tap(page.getByRole('button', { name: /Seattle/ }))
  await expect(page).toHaveURL(/#\/seattle$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seattle')
  await expect(page.locator('.city-switch')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Browse all guides' })).toBeVisible()
  await expect(page.locator('.region-back')).toContainText('Seattle')
  const back = await page.locator('.region-back').boundingBox()
  expect(back?.height ?? 0).toBeGreaterThanOrEqual(44)

  await page.goto('/#/search?q=Pizza')
  await expect(page.getByRole('heading', { name: 'Search Seattle' })).toBeVisible()
  await page.goto('/#/place/canlis')
  await expect(page.getByRole('heading', { level: 1, name: 'Canlis' })).toBeVisible()

  await page.goto('/#/seattle/guide/classics')
  await expect(page.getByRole('heading', { level: 1, name: 'Seattle Classics & Institutions' })).toBeVisible()
  const seattleHome = page.getByRole('button', { name: 'Seattle home' })
  await expect(seattleHome).toHaveAttribute('aria-current', 'true')
  await tap(seattleHome)
  await expect(page).toHaveURL(/#\/seattle$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seattle')
  await expect(page.getByRole('button', { name: 'Seattle home' })).toHaveAttribute('aria-current', 'page')

  await page.goto('/#/seattle/place/canlis')
  await tap(page.getByRole('button', { name: 'Seattle home' }))
  await expect(page).toHaveURL(/#\/seattle$/)

  await page.goto('/#/seattle/explore')
  await tap(page.getByRole('button', { name: 'Eastside' }))
  await expect(page).toHaveURL(/#\/eastside$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Eastside')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/seattle/top')
  await tap(page.getByRole('button', { name: 'Seattle home' }))
  await expect(page).toHaveURL(/#\/seattle$/)
  await expect(page.getByRole('button', { name: 'Seattle home' })).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/#/eastside')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Eastside')
  await expect(page.locator('.city-switch')).toBeVisible()
  await expect(page.locator('.region-back')).toContainText('Seattle')

  await tap(page.locator('.region-back'))
  await expect(page).toHaveURL(/#\/cities/)
  await expect(page.getByRole('heading', { name: 'Choose a city' })).toBeVisible()
  await expect(page.getByText('Pick a city to explore.', { exact: true })).toBeVisible()
  await expect(page.getByText('The city you opened last is marked.')).toHaveCount(0)
  await expect(page.locator('.city-switch')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Seattle/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Los Angeles/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /San Francisco/ })).toBeVisible()

  await tap(page.getByRole('button', { name: /Los Angeles/ }))
  await expect(page).toHaveURL(/#\/la$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Los Angeles')
  const fit = await page.evaluate(() => {
    const header = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0
    const h1 = document.querySelector('#main h1')?.getBoundingClientRect().top ?? 0
    return { gap: h1 - header, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }
  })
  expect(fit.overflow, JSON.stringify(fit)).toBeLessThanOrEqual(8)
  expect(fit.gap, JSON.stringify(fit)).toBeGreaterThanOrEqual(0)
  await expect(page.locator('.city-switch')).toHaveCount(0)
  await expect(page.locator('.region-back')).toContainText('Los Angeles')
  await expect(page.getByRole('link', { name: 'Santa Monica' }).first()).toBeVisible()

  await page.goto('/#/la/search?q=sushi')
  await expect(page.getByRole('heading', { name: 'Search Los Angeles' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Katana' })).toBeVisible()

  await page.goto('/#/la/place/katana')
  await expect(page.getByRole('heading', { level: 1, name: 'Katana' })).toBeVisible()
  await expect(page.locator('.score-badge.is-muted').first()).toBeVisible()
  await expect(page.getByText(/Yelp 4\.1/).first()).toBeVisible()

  await page.goto('/#/la/explore')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Los Angeles')

  await page.goto('/#/cities')
  await expect(page.getByRole('button', { name: /Los Angeles/ })).toContainText('Last opened')
  const memory = await page.evaluate(() => localStorage.getItem('gusto.region.v1'))
  expect(memory).toContain('"area":"la"')

  await tap(page.getByRole('button', { name: /Seattle/ }))
  await expect(page).toHaveURL(/#\/(seattle|eastside)$/)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(8)
  expect(issues, issues.join('\n')).toEqual([])
})
