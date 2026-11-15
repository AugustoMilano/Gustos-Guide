import { expect, test, type Page } from '@playwright/test'

async function scrollY(page: Page) {
  return page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement
    return root.scrollTop || window.scrollY || 0
  })
}

async function waitForRestore(page: Page, expected: number, slack = 20) {
  await expect.poll(async () => scrollY(page), { timeout: 8_000 }).toBeGreaterThanOrEqual(expected - slack)
  const actual = await scrollY(page)
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(slack)
  return actual
}

async function openFourthAndReturn(page: Page, listUrl: string, row: string, back: 'site' | 'browser') {
  await page.goto(listUrl)
  const item = page.locator(row).nth(3)
  await expect(item).toBeVisible()
  await item.scrollIntoViewIfNeeded()
  await page.evaluate(async () => {
    const root = document.scrollingElement ?? document.documentElement
    let last = -1
    for (let i = 0; i < 20; i += 1) {
      if (root.scrollHeight === last) break
      last = root.scrollHeight
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    window.dispatchEvent(new Event('scroll'))
  })
  const before = await scrollY(page)
  expect(before).toBeGreaterThan(40)
  const nameLink = item.locator('h3 a')
  if (await nameLink.count()) await nameLink.click()
  else await item.click()
  await expect(page.locator('.place-back button')).toBeVisible()
  if (back === 'site') await page.locator('.place-back button').click()
  else await page.goBack()
  await expect(item).toBeVisible()
  const after = await waitForRestore(page, before)
  const inView = await item.evaluate((node) => {
    const box = node.getBoundingClientRect()
    return box.top < window.innerHeight && box.bottom > 0
  })
  expect(inView).toBe(true)
  return { before, after }
}

test('back from a place returns the guide list to the same spot', async ({ page }, info) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  const phone = info.project.name === 'webkit'
  await page.setViewportSize({ width: phone ? 390 : 1440, height: phone ? 844 : 900 })
  const guide = '/#/seattle/guide/pike-place'
  const row = 'article.guide-entry'
  const site = await openFourthAndReturn(page, guide, row, 'site')
  const browser = await openFourthAndReturn(page, guide, row, 'browser')
  // A fresh visit still starts at the top.
  await page.goto('/#/seattle/guides')
  await page.getByRole('link', { name: 'Pike Place Market Essentials' }).first().click()
  await expect(page.locator(row).nth(3)).toBeVisible()
  expect(await scrollY(page)).toBeLessThanOrEqual(20)
  expect(site.before).toBeGreaterThan(40)
  expect(browser.before).toBeGreaterThan(40)
})

test('back from a place returns the Top 25 list to the same spot', async ({ page }, info) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  const phone = info.project.name === 'webkit'
  await page.setViewportSize({ width: phone ? 390 : 1440, height: phone ? 844 : 900 })
  await openFourthAndReturn(page, '/#/seattle/top', 'a.top-row, .top-row', 'site')
  await openFourthAndReturn(page, '/#/seattle/top', 'a.top-row, .top-row', 'browser')
})
