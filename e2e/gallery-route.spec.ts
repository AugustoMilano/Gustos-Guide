import { expect, test, type Page } from '@playwright/test'

type Frame = { h1: string | null; counter: string | null; thumbs: number; src: string | null }

const stops = [
  { id: 'von-s-1000spirits', name: "Von's 1000Spirits", photo: 'von-s-1000spirits-gusto-1', count: 3, fromPhoto: 3 },
  { id: 'hellenika-cultured-creamery', name: 'HELLENIKA Cultured Creamery', photo: 'hellenika-cultured-creamery', forbid: 'gusto', count: 2, fromPhoto: 3 },
  { id: 'roquette', name: 'Roquette', photo: 'roquette-gusto-1', count: 1, fromPhoto: 0 },
  { id: 'la-loba', name: 'La Loba', photo: 'la-loba-gusto-1', count: 18, fromPhoto: 0 },
  { id: 'storyville-coffee-company', name: 'Storyville Coffee Company', photo: 'storyville-coffee-company-gusto-1', count: 3, fromPhoto: 0 },
]

async function selectPhoto(page: Page, index: number, total: number) {
  const tab = page.getByRole('tab', { name: `Photo ${index} of ${total}` })
  await tab.evaluate((node) => {
    node.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    ;(node as HTMLButtonElement).click()
  })
}

async function watch(page: Page) {
  await page.evaluate(() => {
    const win = window as Window & { __galleryFrames?: Frame[] }
    win.__galleryFrames = []
    const grab = () => {
      const img = document.querySelector<HTMLImageElement>('.photo-frame img')
      const raw = img ? (img.currentSrc || img.getAttribute('src') || '') : ''
      win.__galleryFrames?.push({
        h1: document.querySelector('h1')?.textContent?.trim() ?? null,
        counter: document.querySelector('.photo-expand')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
        thumbs: document.querySelectorAll('.photo-thumb').length,
        src: raw ? raw.split('/').pop() ?? null : null,
      })
    }
    grab()
    const obs = new MutationObserver(grab)
    obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
    window.setTimeout(() => obs.disconnect(), 1500)
  })
}

async function frames(page: Page) {
  return page.evaluate(() => (window as Window & { __galleryFrames?: Frame[] }).__galleryFrames ?? [])
}

test('hash changes reset the gallery to the new place without a reload', async ({ page }) => {
  await page.route(/supabase\.co/, (route) => route.abort())
  await page.goto('/#/seattle/place/storyville-coffee-company')
  await expect(page.locator('.photo-expand')).toHaveText('1 / 3')
  await expect(page.locator('.photo-thumb')).toHaveCount(3)
  await selectPhoto(page, 3, 3)
  await expect(page.locator('.photo-expand')).toHaveText('3 / 3')

  let previous = 'storyville-coffee-company'
  for (const [index, stop] of stops.entries()) {
    if (stop.fromPhoto > 1) {
      await selectPhoto(page, stop.fromPhoto, stops[index - 1]?.count ?? 3)
      await expect(page.locator('.photo-expand')).toHaveText(`${stop.fromPhoto} / ${stops[index - 1]?.count ?? 3}`)
    }
    await watch(page)
    if (index === stops.length - 1) {
      await page.evaluate((id) => {
        location.hash = `#/seattle/place/${id}`
      }, stop.id)
    } else {
      await page.evaluate((id) => {
        const link = document.createElement('a')
        link.href = `#/seattle/place/${id}`
        link.textContent = id
        document.body.appendChild(link)
        link.click()
      }, stop.id)
    }
    await expect(page.locator('h1')).toHaveText(stop.name)
    await expect(page.locator('.photo-expand')).toHaveText(`1 / ${stop.count}`)
    if (stop.count > 1) await expect(page.locator('.photo-thumb')).toHaveCount(stop.count)
    else await expect(page.locator('.photo-thumb')).toHaveCount(0)
    const seen = await frames(page)
    const crossed = seen.filter((frame) => frame.h1 === stop.name)
    expect(crossed.length).toBeGreaterThan(0)
    for (const frame of crossed) {
      expect(frame.counter, `${stop.id} showed ${frame.counter}`).toBe(`1 / ${stop.count}`)
      if (frame.src) expect(frame.src.includes(previous), `${stop.id} kept ${frame.src}`).toBe(false)
    }
    const hero = page.locator('.photo-frame img').first()
    await expect.poll(() => hero.evaluate((node) => (node as HTMLImageElement).currentSrc || node.getAttribute('src') || '')).toContain(stop.photo)
    if ('forbid' in stop && stop.forbid) {
      expect(await hero.evaluate((node) => (node as HTMLImageElement).currentSrc || node.getAttribute('src') || '')).not.toContain(stop.forbid)
    }
    if (stop.count > 1) await expect(page.getByRole('tab', { name: `Photo 1 of ${stop.count}` })).toHaveAttribute('aria-selected', 'true')
    previous = stop.id
  }
})
