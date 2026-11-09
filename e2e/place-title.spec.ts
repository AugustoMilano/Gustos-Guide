import { expect, test } from '@playwright/test'

const WIDTHS = [800, 1024, 1280, 1440]

test('Betty Restaurant & Bar keeps whole words in the map list and a guide', async ({ page }) => {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/seattle/explore')
    const name = page.locator('#explore-betty-restaurant-bar .place-row-copy span').first()
    await expect(name).toBeVisible()
    const lines = await name.evaluate((el) => {
      const node = el.firstChild
      if (!node || node.nodeType !== Node.TEXT_NODE) return []
      const rows: string[] = []
      let line = ''
      let lastTop: number | null = null
      for (let i = 0; i < node.textContent!.length; i++) {
        const range = document.createRange()
        range.setStart(node, i)
        range.setEnd(node, i + 1)
        const box = range.getClientRects()[0]
        if (!box) continue
        const top = Math.round(box.top)
        if (lastTop != null && Math.abs(top - lastTop) > 2) {
          rows.push(line)
          line = ''
        }
        line += node.textContent![i]
        lastTop = top
      }
      if (line) rows.push(line)
      return rows
    })
    const copy = await name.evaluate((el) => Math.round(el.parentElement!.getBoundingClientRect().width))
    expect(copy, `map title width at ${width}`).toBeGreaterThanOrEqual(192)
    expect(lines.join(''), `map lines at ${width}`).toBe('Betty Restaurant & Bar')
    expect(lines.some((line) => /restaur/i.test(line) && !/restaurant/i.test(line)), `split word at ${width}: ${lines.join('|')}`).toBe(false)
  }
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/seattle/guide/queen-anne-incl-lower-queen-anne')
    const title = page.locator('#entry-betty-restaurant-bar h3 a')
    await expect(title).toBeVisible()
    const widthPx = await title.evaluate((el) => Math.round(el.getBoundingClientRect().width))
    expect(widthPx, `guide title width at ${width}`).toBeGreaterThanOrEqual(192)
    await expect(title).toHaveText('Betty Restaurant & Bar')
  }
})
