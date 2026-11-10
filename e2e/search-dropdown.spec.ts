import { expect, test, type Locator, type Page } from '@playwright/test'

function parseRgb(value: string): [number, number, number] {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) throw new Error(value)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function channel(value: number): number {
  const unit = value / 255
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
}

function contrast(foreground: string, background: string): number {
  const lum = (color: string) => {
    const [red, green, blue] = parseRgb(color).map(channel)
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }
  const lighter = Math.max(lum(foreground), lum(background))
  const darker = Math.min(lum(foreground), lum(background))
  return (lighter + 0.05) / (darker + 0.05)
}

async function paint(locator: Locator) {
  return locator.evaluate((node) => {
    const style = getComputedStyle(node)
    let background = style.backgroundColor
    let parent: Element | null = node.parentElement
    while (background === 'rgba(0, 0, 0, 0)' && parent) {
      background = getComputedStyle(parent).backgroundColor
      parent = parent.parentElement
    }
    return { color: style.color, fill: style.webkitTextFillColor, background }
  })
}

async function openSuggestions(page: Page) {
  const narrow = page.viewportSize()!.width < 700
  await page.goto('/#/eastside')
  if (narrow) await page.getByRole('button', { name: 'Menu' }).click()
  const input = page.locator(narrow ? '#menu-search' : '#site-search')
  await input.fill('ba')
  await expect(page.locator('.search-pop button').first()).toBeVisible()
  return input
}

test('Eastside header suggestions keep the full label readable', async ({ page }) => {
  const input = await openSuggestions(page)
  const row = page.locator('.search-pop [role="option"]').first()
  const name = row.locator('span').first()
  const detail = row.locator('span.uppercase')
  const marks = row.locator('mark')
  await expect(name).toContainText("Baron's Sino Kitchen & Bar")
  await expect(detail).toHaveText('Place name')
  await expect(marks).toHaveText(['Ba', 'Ba'])

  for (const locator of [name, detail, marks.nth(0), marks.nth(1)]) {
    const painted = await paint(locator)
    expect(contrast(painted.fill, painted.background)).toBeGreaterThan(4.5)
  }

  await input.press('ArrowDown')
  await expect(row).toHaveAttribute('aria-selected', 'true')
  for (const locator of [name, detail, marks.nth(0), marks.nth(1)]) {
    const painted = await paint(locator)
    expect(contrast(painted.fill, painted.background)).toBeGreaterThan(4.5)
  }

  await row.hover()
  await expect(row).toHaveClass(/is-active/)
  const hovered = await paint(marks.nth(1))
  expect(contrast(hovered.fill, (await paint(row)).background)).toBeGreaterThan(4.5)

  await row.click()
  await expect(page).toHaveURL(/\/place\//)
})

test('suggestions stay readable after the header leaves the hero', async ({ page }) => {
  const narrow = page.viewportSize()!.width < 700
  await page.goto('/#/eastside/guides')
  await expect(page.locator('.site-header')).not.toHaveClass(/on-hero/)
  if (narrow) await page.getByRole('button', { name: 'Menu' }).click()
  const input = page.locator(narrow ? '#menu-search' : '#site-search')
  await input.fill('ba')
  const row = page.locator('.search-pop [role="option"]').first()
  await expect(row).toBeVisible()
  const name = await paint(row.locator('span').first())
  const detail = await paint(row.locator('span.uppercase'))
  expect(contrast(name.fill, name.background)).toBeGreaterThan(4.5)
  expect(contrast(detail.fill, detail.background)).toBeGreaterThan(4.5)
})
