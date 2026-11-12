import { expect, test, type Page } from '@playwright/test'

const house = {
  'mee-sum-pastry': 8.4,
  'le-panier': 9.2,
  'storyville-coffee-company': 9.0,
  'la-loba': 9.6,
  'piroshky-piroshky': 8.9,
  'lonely-siren': 8.3,
}

async function badgeText(page: Page, selector: string) {
  const badge = page.locator(selector).first()
  await expect(badge).toBeVisible()
  return (await badge.innerText()).replace(/\s+/g, ' ').trim()
}

test.use({ reducedMotion: 'no-preference' })

test('one house score is the number on every surface, with no count-up', async ({ page }, info) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.addInitScript((scores) => {
    localStorage.setItem('gusto.house.v1', JSON.stringify(scores))
  }, house)
  const width = info.project.name === 'webkit' ? 390 : 1440
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/#/seattle/guide/pike-place')
  const mee = page.locator('#entry-mee-sum-pastry .score-badge').first()
  await expect(mee).toBeVisible()
  await expect(mee).toContainText('8.4')
  expect(await mee.innerText()).not.toContain('6.4')
  const compact = page.locator('.toc-card', { has: page.getByRole('heading', { name: /Mee Sum Pastry/ }) }).locator('.score-badge')
  await expect(compact).toContainText('8.4')
  for (const [id, label] of [['mee-sum-pastry', 'Mee Sum'], ['le-panier', 'Le Panier'], ['storyville-coffee-company', 'Storyville']] as const) {
    const expanded = await badgeText(page, `#entry-${id} .score-badge`)
    const card = page.locator('.toc-card', { has: page.getByRole('heading', { name: new RegExp(label) }) }).locator('.score-badge')
    await expect(card).toContainText(house[id].toFixed(1))
    expect(expanded).toContain(house[id].toFixed(1))
  }
  await page.getByRole('button', { name: 'Guide order' }).click()
  const order = await page.locator('article.guide-entry').evaluateAll((nodes) => nodes.map((node) => node.id))
  expect(order.indexOf('entry-storyville-coffee-company') + 1).toBe(order.indexOf('entry-mee-sum-pastry'))

  async function snap(selector: string, file: string) {
    if (info.project.name !== 'chromium') return
    await page.locator(selector).first().screenshot({ path: `/opt/cursor/artifacts/${file}.png`, animations: 'disabled' })
  }
  await page.goto('/#/seattle/place/mee-sum-pastry')
  await expect(page.locator('.score-badge').first()).toContainText('8.4')
  await snap('.score-badge', 'mee-sum-place-after-chromium')
  await page.goto('/#/seattle/place/le-panier')
  await expect(page.locator('.score-badge').first()).toContainText('9.2')
  await snap('.score-badge', 'le-panier-place-after-chromium')
  await page.goto('/#/seattle/place/storyville-coffee-company')
  await expect(page.locator('.score-badge').first()).toContainText('9.0')
  await snap('.score-badge', 'storyville-place-after-chromium')
  await page.goto('/#/seattle/place/la-loba')
  await expect(page.locator('.score-badge').first()).toContainText('9.6')
  await snap('.score-badge', 'la-loba-place-after-chromium')

  await page.goto('/#/seattle/guide/pike-place')
  await page.getByRole('button', { name: "Gusto's Score" }).click()
  const ranked = await page.locator('article.guide-entry').evaluateAll((nodes) => nodes.map((node) => node.id))
  expect(ranked.indexOf('entry-piroshky-piroshky')).toBeLessThan(ranked.indexOf('entry-mee-sum-pastry'))
  expect(ranked.indexOf('entry-mee-sum-pastry')).toBeLessThan(ranked.indexOf('entry-lonely-siren'))
  await snap('#entry-mee-sum-pastry .score-badge', 'mee-sum-expanded-after-chromium')
  await snap('.toc-card:has-text("Mee Sum Pastry") .score-badge', 'mee-sum-compact-after-chromium')
  await snap('.toc-card:has-text("Le Panier") .score-badge', 'le-panier-compact-after-chromium')

  const search = page.getByPlaceholder('Search')
  if (await search.isVisible()) {
    await search.fill('Mee Sum')
    await page.getByRole('option', { name: /Mee Sum Pastry/ }).click()
    await expect(page).toHaveURL(/mee-sum-pastry/)
    await expect(page.locator('.score-badge').first()).toContainText('8.4')
  }

  await page.goto('/#/seattle/top')
  const top = page.locator('.top-row, .podium-name').filter({ hasText: 'Mee Sum Pastry' })
  if (await top.count()) await expect(top.locator('.score-badge, .podium-score').first()).toContainText('8.4')
})
