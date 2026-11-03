import { chromium, webkit, devices } from 'playwright'
import { readFileSync } from 'node:fs'
const base = process.env.BASE || 'http://localhost:4318'
const out = '/workspace/gustos/qa-regions'
const nyc = JSON.parse(readFileSync('src/content/nyc.json','utf8')).places[0].id
const mos = JSON.parse(readFileSync('src/content/palouse.json','utf8')).places.find(p=>p.city==='moscow').id
const views = { phone: devices['iPhone 13'], ipad: devices['iPad (gen 7)'], desktop: { viewport: { width: 1440, height: 900 } } }
const routes = [
  ['/', 'Where are you eating?'],
  ['/vancouver', 'Eat across Vancouver.'], ['/portland', 'Eat across Portland.'], ['/nyc', 'Eat across New York.'], ['/pullman', 'Eat across Pullman.'], ['/moscow', 'Eat across Moscow.'],
  ['/vancouver/top', 'Top 25 · Vancouver'], ['/nyc/top', 'Top 25 · New York'], ['/portland/top', 'Top 25 · Portland'], ['/pullman/top', 'Top 25 · Pullman, WA'],
  ['/nyc/guides', 'New York guides'], ['/portland/guide/pdx-downtown', 'Downtown'], ['/vancouver/guide/van-granville-island-public-market', 'Granville Island Public Market'], ['/nyc/place/fiore-s-house-of-quality', 'Fiore'],
  ['/nyc/place/' + nyc, null], ['/moscow/place/' + mos, null],
  ['/vancouver/explore', null], ['/pullman/explore', null], ['/nyc/explore', null],
]
const results = []
for (const [ename, engine] of (process.env.ONLY === 'webkit' ? [['webkit', webkit]] : [['chromium', chromium], ['webkit', webkit]])) {
  const browser = await engine.launch()
  for (const [vname, opts] of Object.entries(views)) {
    const { defaultBrowserType, ...o } = opts
    const ctx = await browser.newContext(o)
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    for (const [r, text] of routes) {
      errors.length = 0
      const page = await ctx.newPage()
      page.on('pageerror', (e) => errors.push(String(e)))
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
      await page.goto(base + '/#' + r, { waitUntil: 'load' })
      await page.waitForTimeout(1500)
      let ok = true, note = ''
      if (text) { ok = await page.getByText(text, { exact: false }).first().isVisible().catch(() => false); note = text }
      if (r.endsWith('/explore')) { await page.waitForTimeout(1500); const n = await page.locator('.leaflet-marker-icon, .marker-cluster').count(); ok = n > 0; note = `markers ${n}` }
      if (r.includes('/place/')) { const h = await page.locator('h1').first().textContent().catch(() => ''); ok = !!h && h.trim().length > 1; note = `h1 ${h}` }
      const errs = errors.filter((e) => !/tiles|openfreemap|Failed to load resource|Access-Control-Allow-Origin|sw\.js|supabase|analytics|cloudflareinsights/i.test(e))
      results.push([ename, vname, r, ok && !errs.length ? 'OK' : 'FAIL', note, errs.slice(0, 2).join(' | ')])
      if (['/pullman', '/vancouver/explore', '/nyc/top', '/', '/nyc/place/' + nyc].includes(r)) await page.screenshot({ path: `${out}/${ename}-${vname}-${r.replace(/\//g, '_') || 'root'}.png` })
      await page.close()
    }
    // Pullman -> Moscow switch
    await page.goto(base + '/#/pullman', { waitUntil: 'load' }); await page.waitForTimeout(2000)
    const sw = page.locator('button.city-switch-btn').filter({ hasText: /Moscow, ID/ }).first()
    let swOk = false
    if (await sw.isVisible().catch(() => false)) { try { await sw.click({ timeout: 8000 }) } catch (e) { results.push([ename, vname, 'switch click', 'FAIL', String(e).split('\n')[0], '']) }; await page.waitForTimeout(1200); swOk = page.url().includes('/moscow') && await page.getByText('Eat across Moscow.').first().isVisible().catch(() => false) }
    results.push([ename, vname, 'pullman->moscow switch', swOk ? 'OK' : 'FAIL', page.url(), ''])
    await ctx.close()
  }
  await browser.close()
}
for (const r of results) console.log(r.join('\t'))
console.log('FAILS', results.filter((r) => r[3] !== 'OK').length, 'of', results.length)
