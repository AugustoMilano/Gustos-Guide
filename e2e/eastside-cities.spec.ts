import { expect, test } from '@playwright/test'

test('Eastside city tiles list every place in that city', async ({ page }) => {
  await page.goto('/#/eastside/guides')
  const cities = page.getByRole('heading', { level: 2, name: 'Cities' })
  const section = page.locator('section').filter({ has: cities })
  await expect(section.getByRole('link')).toHaveCount(8)
  for (const [name, count] of [
    ['Bellevue', '50 places'],
    ['Kirkland', '13 places'],
    ['Redmond', '14 places'],
    ['Issaquah', '2 places'],
    ['Mercer Island', '3 places'],
    ['Renton', '1 place'],
    ['Sammamish', '1 place'],
    ['Woodinville', '1 place'],
  ] as const) {
    const card = section.getByRole('link', { name: new RegExp(`${count}\\s+${name}$`) })
    await expect(card).toBeVisible()
  }
  await expect(section.getByRole('heading', { level: 3, name: 'Bellevue Essentials' })).toHaveCount(0)

  await section.getByRole('link', { name: /50 places\s+Bellevue$/ }).click()
  await expect(page).toHaveURL(/\/eastside\/city\/bellevue$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Bellevue' })).toBeVisible()
  const bellevue = page.getByRole('list', { name: 'Places in Bellevue' })
  await expect(bellevue.getByRole('link')).toHaveCount(50)
  await expect(bellevue.getByRole('link', { name: /Bis on Main/ })).toBeVisible()
  await expect(bellevue.getByRole('link', { name: /BeachHouse/ })).toHaveCount(0)
  await expect(bellevue.getByRole('link', { name: /Vivi Pizzeria/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Bellevue Essentials' })).toBeVisible()

  await page.goto('/#/eastside/city/kirkland')
  const kirkland = page.getByRole('list', { name: 'Places in Kirkland' })
  await expect(kirkland.getByRole('link')).toHaveCount(13)
  await expect(kirkland.getByRole('link', { name: /BeachHouse/ })).toBeVisible()
  await expect(kirkland.getByRole('link', { name: /Bis on Main/ })).toHaveCount(0)

  await page.goto('/#/eastside/city/redmond')
  await expect(page.getByRole('list', { name: 'Places in Redmond' }).getByRole('link')).toHaveCount(14)
  await expect(page.getByRole('link', { name: /Woodblock/ })).toBeVisible()

  await page.goto('/#/eastside/city/woodinville')
  await expect(page.getByRole('link', { name: /Vivi Pizzeria/ })).toBeVisible()
  await page.goto('/#/eastside/city/mercer-island')
  await expect(page.getByRole('link', { name: /Barrels Wine Bar/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Tanoor/ })).toHaveCount(0)
  await page.goto('/#/eastside/city/sammamish')
  await expect(page.getByRole('link', { name: /Tanoor/ })).toBeVisible()

  await page.goto('/#/eastside/guide/bellevue')
  await expect(page.getByRole('heading', { level: 1, name: 'Bellevue Essentials' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(15)
  await page.goto('/#/eastside/guide/kirkland')
  await expect(page.getByRole('heading', { level: 1, name: 'Best of Kirkland' })).toBeVisible()
  await expect(page.locator('article.guide-entry')).toHaveCount(12)
  await page.goto('/#/eastside/guide/redmond')
  await expect(page.locator('article.guide-entry')).toHaveCount(11)
})
