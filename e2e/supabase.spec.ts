import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const enabled = Boolean(url && key) && !process.env.CI

test.describe('supabase', () => {
  test.skip(!enabled, 'Skipped unless VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set, and never in CI.')

  test('publishable key is accepted', async ({ request }, info) => {
    test.skip(info.project.name !== 'chromium', 'chromium only')
    const settings = await request.get(`${url}/auth/v1/settings`, { headers: { apikey: key! } })
    expect(settings.ok()).toBeTruthy()
    const body = (await settings.json()) as { external?: { email?: boolean } }
    expect(body.external?.email).toBe(true)

    const client = createClient(url!, key!, {
      auth: { persistSession: false, flowType: 'pkce', detectSessionInUrl: false },
    })
    const { error } = await client.from('house_scores').select('place_id').limit(1)
    if (error) {
      expect(error.message.toLowerCase()).not.toContain('invalid api key')
      expect(error.message.toLowerCase()).not.toContain('no suitable key')
    }
  })

  test('magic link sign-in hides providers and demo friends', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'chromium only')
    await page.goto('/#/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Sign in' }).first().click()
    const form = page.getByRole('dialog', { name: 'Sign in' }).locator('form')
    const mode = await form.getAttribute('data-auth')
    test.skip(mode !== 'magic', 'Dev server was started without the Supabase env vars.')
    await expect(form.getByLabel('Email')).toBeVisible()
    await expect(form.getByRole('button', { name: 'Email me a link' })).toBeVisible()
    await expect(form.getByRole('button', { name: 'Sign in with Apple' })).toHaveCount(0)
    await expect(form.getByRole('button', { name: 'Sign in with Google' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.goto('/#/feed')
    await expect(page.getByText('Mina Cho')).toHaveCount(0)
    await expect(page.getByText(/Demo friends/)).toHaveCount(0)
    await expect(page.getByText('Friends only')).toBeVisible()
  })
})
