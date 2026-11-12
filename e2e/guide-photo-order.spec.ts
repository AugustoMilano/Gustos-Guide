import { expect, test, type Page } from '@playwright/test'

const entries = [
  { id: 'le-panier', name: 'Le Panier' },
  { id: 'mee-sum-pastry', name: 'Mee Sum Pastry' },
  { id: 'piroshky-piroshky', name: 'Piroshky Piroshky' },
  { id: 'lonely-siren', name: 'Lonely Siren' },
]

async function photoBeforeHeading(page: Page, id: string) {
  const order = await page.evaluate((placeId) => {
    const entry = document.getElementById(`entry-${placeId}`)
    const photo = entry?.querySelector('.guide-shot img')
    const heading = entry?.querySelector('h3')
    const text = entry?.querySelector('p')
    const top = (node: Element | null | undefined) => (node ? node.getBoundingClientRect().top + window.scrollY : null)
    return { photo: top(photo), heading: top(heading), text: top(text) }
  }, id)
  expect(order.photo, id).not.toBeNull()
  expect(order.heading, id).not.toBeNull()
  expect(order.photo!, `${id} heading`).toBeLessThan(order.heading!)
  if (order.text != null) expect(order.photo!, `${id} description`).toBeLessThan(order.text)
}

test('Pike Place guide photos stay above the title for house and legacy shots', async ({ page }, info) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  const widths = info.project.name === 'webkit' ? [390, 430] : [390, 471, 1440]
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/seattle/guide/pike-place')
    await expect(page.locator('#entry-le-panier')).toBeVisible()
    for (const entry of entries) await photoBeforeHeading(page, entry.id)
    const compactOrder = await page.evaluate(() => {
      const card = [...document.querySelectorAll('.toc-card')].find((node) => node.textContent?.includes('Piroshky Piroshky'))
      const photo = card?.querySelector('.toc-shot img')
      const heading = card?.querySelector('h3')
      const top = (node: Element | null | undefined) => (node ? node.getBoundingClientRect().top + window.scrollY : null)
      return { photo: top(photo), heading: top(heading) }
    })
    expect(compactOrder.photo).not.toBeNull()
    expect(compactOrder.photo!).toBeLessThan(compactOrder.heading!)
  }
})

test('Piroshky portrait framing keeps the pastry and other portraits keep the top', async ({ page }, info) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.setViewportSize({ width: info.project.name === 'webkit' ? 390 : 430, height: 844 })
  await page.goto('/#/seattle/guide/pike-place')
  const compact = page.locator('.toc-card', { has: page.getByRole('heading', { name: 'Piroshky Piroshky' }) }).locator('.toc-shot img')
  const expanded = page.locator('#entry-piroshky-piroshky .guide-shot img')
  await expect(compact).toHaveClass(/is-portrait-lower/)
  await expect(expanded).toHaveClass(/is-portrait-lower/)
  for (const img of [compact, expanded]) {
    await expect.poll(() => img.evaluate((node) => getComputedStyle(node).objectPosition)).toBe('50% 68%')
  }
  async function frame(id: string, file: string) {
    const clip = await page.evaluate((placeId) => {
      const header = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-offset')) || 88
      const node = document.querySelector(`#entry-${placeId} .guide-shot`)
      if (!node) return null
      const top = node.getBoundingClientRect().top + window.scrollY - header - 12
      window.scrollTo(0, Math.max(0, top))
      const photo = document.querySelector(`#entry-${placeId} .guide-shot`)?.getBoundingClientRect()
      const heading = document.querySelector(`#entry-${placeId} h3`)?.getBoundingClientRect()
      if (!photo || !heading) return null
      const y = Math.max(0, Math.floor(photo.top))
      const bottom = Math.min(window.innerHeight, Math.ceil(heading.bottom + 12))
      return { x: 0, y, width: window.innerWidth, height: Math.max(1, bottom - y) }
    }, id)
    expect(clip).not.toBeNull()
    await page.screenshot({ path: `/opt/cursor/artifacts/${file}-${info.project.name}.png`, clip: clip!, animations: 'disabled' })
  }
  await frame('le-panier', 'guide-le-panier')
  await frame('mee-sum-pastry', 'guide-mee-sum')
  await frame('piroshky-piroshky', 'guide-piroshky-expanded')
  const compactClip = await compact.evaluate((node) => {
    node.scrollIntoView({ block: 'center', inline: 'center' })
    const box = node.getBoundingClientRect()
    return {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.min(box.width, window.innerWidth - Math.max(0, box.x)),
      height: Math.min(box.height, window.innerHeight - Math.max(0, box.y)),
    }
  })
  await page.screenshot({ path: `/opt/cursor/artifacts/guide-piroshky-compact-${info.project.name}.png`, clip: compactClip, animations: 'disabled' })

  await page.goto('/#/seattle/place/piroshky-piroshky')
  const hero = page.locator('.photo-frame img').first()
  await expect(hero).toHaveClass(/is-portrait-lower/)
  await expect.poll(() => hero.evaluate((node) => getComputedStyle(node).objectPosition)).toBe('50% 68%')
  const heroClip = await hero.evaluate((node) => {
    node.scrollIntoView({ block: 'center', inline: 'nearest' })
    const box = node.getBoundingClientRect()
    const x = Math.max(0, box.x)
    const y = Math.max(0, box.y)
    return {
      x,
      y,
      width: Math.max(1, Math.min(box.width, window.innerWidth - x)),
      height: Math.max(1, Math.min(box.height, window.innerHeight - y)),
    }
  })
  await page.screenshot({ path: `/opt/cursor/artifacts/guide-piroshky-hero-${info.project.name}.png`, clip: heroClip, animations: 'disabled' })

  await page.goto('/#/seattle/place/beecher-s-handmade-cheese')
  const beecher = page.locator('.photo-frame img').first()
  await expect(beecher).toHaveClass(/is-portrait/)
  await expect(beecher).not.toHaveClass(/is-portrait-lower/)
  await expect.poll(() => beecher.evaluate((node) => getComputedStyle(node).objectPosition)).toBe('50% 18%')
})
