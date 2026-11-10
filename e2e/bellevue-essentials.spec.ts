import { expect, test } from '@playwright/test'

const main = [
  'Ascend Prime Steak & Sushi',
  "Daniel's Broiler",
  'Water Grill',
  'La Mar',
  "Carmine's",
  'STK Steakhouse',
  'Cantinetta',
  'Cantina Monarca',
  "Baron's Sino Kitchen & Bar",
  'Wild Ginger',
  'Farzi Cafe',
  'Seastar Restaurant & Raw Bar',
  'Castilla',
  'Fern Thai on Main',
  'Joey Bellevue',
  'Monsoon Bellevue',
  'Fogo de Chão',
]

const japanese = [
  'Minamoto Japanese Restaurant',
  'Ramen Nori',
  'Hokkaido Ramen Santouka',
  'Japonessa Sushi Cocina',
  'Ginza',
  'FOB Poke Bar',
  'Rolls & Rolls Plus Sushi',
  'Kura Revolving Sushi Bar',
  'Takai by Kashiba',
]

test('the Bellevue URL is Bellevue Essentials and Japanese food is its own guide', async ({ page }) => {
  await page.goto('/#/eastside/guide/bellevue')
  await expect(page).toHaveURL(/\/eastside\/guide\/bellevue$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Bellevue Essentials' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(main.length)
  for (const name of main) {
    await expect(page.locator('article.guide-entry').getByRole('heading', { level: 3, name, exact: true })).toBeVisible()
  }
  await expect(page.locator('#entry-japonessa')).toHaveCount(0)
  await expect(page.locator('#entry-fob-poke-bar-bellevue')).toHaveCount(0)
  await page.goto('/#/eastside/guide/japanese-food-in-bellevue')
  await expect(page.getByRole('heading', { level: 1, name: 'Japanese food in Bellevue' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(japanese.length)
  for (const name of japanese) {
    await expect(page.locator('article.guide-entry').getByRole('heading', { level: 3, name, exact: true })).toBeVisible()
  }
})
