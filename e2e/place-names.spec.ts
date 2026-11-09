import { expect, test, type Page } from '@playwright/test'

/** The ten longest catalog names, plus Betty and the longest single words. */
const NAMES = [
  ['la', 'the-butcher-the-baker-the-cappuccino-maker', 'The Butcher, The Baker, The Cappuccino Maker'],
  ['vancouver', 'paul-bakery-patisserie-cafe-and-restaurant', 'PAUL Bakery, Patisserie, Café and Restaurant'],
  ['nyc', 'the-dining-room-at-rh-guesthouse-new-york', 'The Dining Room at RH Guesthouse New York'],
  ['seattle', 'afternoon-tea-at-fairmont-olympic-hotel', 'Afternoon Tea at Fairmont Olympic Hotel'],
  ['vancouver', 'top-of-vancouver-revolving-restaurant', 'Top of Vancouver Revolving Restaurant'],
  ['sf', 'the-matterhorn-restaurant-and-bakery', 'The Matterhorn Restaurant and Bakery'],
  ['nyc', 'rio-de-la-plata-bakery-pastry-shop', 'Rio De La Plata Bakery - Pastry Shop'],
  ['la', 'carlitos-gardel-argentine-steakhouse', 'Carlitos Gardel Argentine Steakhouse'],
  ['seattle', 'mamma-melina-ristorante-pizzeria', 'Mamma Melina Ristorante + Pizzeria'],
  ['sf', 'golden-gate-fortune-cookie-factory', 'Golden Gate Fortune Cookie Factory'],
  ['seattle', 'betty-restaurant-bar', 'Betty Restaurant & Bar'],
  ['seattle', 'loretta-s-northwesterner', "Loretta's Northwesterner"],
  ['portland', 'mediterranean-exploration-company', 'Mediterranean Exploration Company'],
] as const

const WIDTHS = [320, 375, 390]

async function openList(page: Page) {
  const list = page.getByRole('button', { name: 'List', exact: true })
  if (await list.isVisible().catch(() => false)) await list.click()
}

async function linesOf(locator: ReturnType<Page['locator']>): Promise<string[]> {
  return locator.evaluate((el) => {
    const textNode = [...el.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
      ?? el.querySelector('a')?.firstChild
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !textNode.textContent) return []
    const rows: string[] = []
    let line = ''
    let lastTop: number | null = null
    for (let i = 0; i < textNode.textContent.length; i++) {
      const range = document.createRange()
      range.setStart(textNode, i)
      range.setEnd(textNode, i + 1)
      const box = range.getClientRects()[0]
      if (!box) continue
      const top = Math.round(box.top)
      if (lastTop != null && Math.abs(top - lastTop) > 2) {
        rows.push(line)
        line = ''
      }
      line += textNode.textContent[i]
      lastTop = top
    }
    if (line) rows.push(line)
    return rows
  })
}

function splitsWord(lines: string[]): boolean {
  for (let i = 0; i < lines.length - 1; i++) {
    const end = lines[i].slice(-1)
    const start = lines[i + 1]?.[0] ?? ''
    if (/[A-Za-z0-9]/.test(end) && /[A-Za-z0-9]/.test(start)) return true
  }
  return false
}

test('long place names stay whole words on a phone', async ({ page }) => {
  test.setTimeout(180_000)
  const broken: string[] = []
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 720 })
    for (const [city, id, name] of NAMES) {
      await page.goto(`/#/${city}/place/${id}`)
      const heading = page.getByRole('heading', { level: 1, name })
      await expect(heading).toBeVisible()
      const headerLines = await linesOf(heading)
      expect(headerLines.length, `${name} header at ${width}`).toBeLessThanOrEqual(3)
      if (splitsWord(headerLines)) broken.push(`${width} header ${name}: ${headerLines.join(' | ')}`)

      await page.goto(`/#/${city}/explore`)
      await openList(page)
      const card = page.locator(`#explore-${id}`)
      const present = await card.count()
      if (present) {
        const nameEl = card.locator('.place-name').first()
        const mapLines = await linesOf(nameEl)
        if (mapLines.join('').trim()) {
          expect(mapLines.length, `${name} map at ${width}`).toBeLessThanOrEqual(3)
          if (splitsWord(mapLines)) broken.push(`${width} map ${name}: ${mapLines.join(' | ')}`)
        }
      }
    }
  }
  expect(broken, broken.join('\n')).toEqual([])
})
