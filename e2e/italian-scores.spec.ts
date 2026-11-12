import { expect, test } from '@playwright/test'

const scored = [
  ['pasta-casalinga', '8.0'],
  ['il-bistro', '7.4'],
  ['that-s-amore-italian-cafe', '7.3'],
  ['barolo-ristorante', '7.1'],
  ['cortina', '7.0'],
  ['due-cucina-italiana', '6.9'],
  ['mamma-melina-ristorante-pizzeria', '6.7'],
] as const

test('Italian & Pasta ranks the seven personal ratings and hides the four removed places', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.addInitScript(() => localStorage.removeItem('gusto.house.v1'))
  await page.goto('/#/seattle/guide/italian')
  await expect(page.getByRole('heading', { level: 1, name: 'Italian & Pasta' })).toBeVisible()
  const ids = await page.locator('article.guide-entry').evaluateAll((nodes) => nodes.map((node) => node.id))
  expect(ids.slice(0, 7)).toEqual(scored.map(([id]) => `entry-${id}`))
  expect(ids).toHaveLength(27)
  for (const id of ['how-to-cook-a-wolf', 'mondello-italian-restaurant', 'cornelly', 'willmott-s-ghost']) {
    expect(ids).not.toContain(`entry-${id}`)
  }
  for (const [id, score] of scored) {
    await expect(page.locator(`#entry-${id} .score-badge`).first()).toContainText(score)
  }
  await page.getByRole('button', { name: 'Guide order' }).click()
  const guideOrder = await page.locator('article.guide-entry').evaluateAll((nodes) => nodes.map((node) => node.id))
  expect(guideOrder[0]).toBe('entry-il-terrazzo-carmine')
  expect(guideOrder).toHaveLength(27)
  expect(guideOrder.indexOf('entry-pasta-casalinga')).toBeLessThan(guideOrder.indexOf('entry-il-nido'))
})
