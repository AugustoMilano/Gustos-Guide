import { expect, test } from '@playwright/test'

const names = [
  'Woodblock',
  'Postdoc Brewing',
  'Bellevue Brewing Company',
  'Earls Kitchen + Bar',
  'Tavern Hall',
  'Moss Bay Hall',
  'Central Bar + Restaurant',
  "Palmer's East",
  'Central Tavern',
  'The Goose Pub & Eatery',
  '520 Bar and Grill',
  'Civility & Unrest',
]

test('Eastside home and guides index open Drinks on the Eastside', async ({ page }) => {
  await page.goto('/#/eastside')
  await page.getByRole('region', { name: 'Featured guides' }).getByRole('link', { name: /Drinks on the Eastside/ }).click()
  await expect(page).toHaveURL(/\/eastside\/guide\/eastside-drinks$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Drinks on the Eastside' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(names.length)
  for (const name of names) {
    await expect(page.locator('article.guide-entry').getByRole('heading', { level: 3, name, exact: true })).toBeVisible()
  }
  await expect(page.locator('#entry-barrels-wine-bar')).toHaveCount(0)
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
    const clipped = await page.locator('section[aria-label="In this guide"] h3.place-name').evaluateAll((nodes) =>
      nodes.map((node) => {
        const html = node.innerHTML
        if (!node.querySelector('.toc-rank')) node.insertAdjacentHTML('afterbegin', '<span class="toc-rank">12</span>')
        const box = node.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(node)
        const outside = [...range.getClientRects()].some((rect) => rect.right > box.right + 1 || rect.left < box.left - 1)
        const text = node.textContent ?? ''
        node.innerHTML = html
        return { text: text.replace(/\s+/g, ' ').trim(), outside }
      }),
    )
    expect(clipped.find((row) => row.text.includes('Woodblock'))?.text).toContain('Woodblock')
    expect(clipped.filter((row) => row.outside).map((row) => row.text)).toEqual([])
  }
  await page.goto('/#/eastside/guides')
  await expect(page.getByRole('heading', { level: 2, name: 'Drinks' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Drinks on the Eastside/ })).toBeVisible()
})
