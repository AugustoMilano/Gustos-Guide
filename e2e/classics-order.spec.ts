import { expect, test } from '@playwright/test'

test('Classics guide order follows the curated sequence and keeps the later members', async ({ page }) => {
  await page.goto('/#/seattle/guide/classics')
  await page.getByRole('button', { name: 'Guide order' }).click()
  const ids = await page.locator('article[id^="entry-"]').evaluateAll((nodes) => nodes.map((node) => node.id))
  expect(ids.slice(0, 8)).toEqual([
    'entry-canlis',
    'entry-metropolitan-grill',
    'entry-dick-s-drive-in',
    'entry-beecher-s-handmade-cheese',
    'entry-the-pink-door',
    'entry-paseo',
    'entry-cafe-campagne',
    'entry-dog-in-the-park',
  ])
  expect(ids).toContain('entry-il-terrazzo-carmine')
  expect(ids).toContain('entry-starbucks-coffee-company')
  expect(ids.filter((id) => id === 'entry-paseo')).toEqual(['entry-paseo'])
  expect(ids).not.toContain('entry-luna-park-cafe')
})
