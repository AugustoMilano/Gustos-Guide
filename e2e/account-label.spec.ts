import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, name: string) {
  const direct = page.getByRole('button', { name: 'Sign in', exact: true })
  if (!(await direct.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Menu' }).click()
  }
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const form = page.locator('form[data-auth]')
  await expect(form).toBeVisible()
  const mode = await form.getAttribute('data-auth')
  test.skip(mode !== 'local', 'This build signs in with a provider, so the local name field is not shown.')
  await page.getByLabel('Name').fill(name)
  await page.locator('form[data-auth]').evaluate((form) => (form as HTMLFormElement).requestSubmit())
  await expect(form).toBeHidden()
}

async function openAccount(page: import('@playwright/test').Page) {
  const menu = page.getByRole('button', { name: 'Menu' })
  if (await menu.isVisible().catch(() => false)) await menu.click()
}

test.describe('signed-in account label', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/seattle')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
  ]) {
    test(`${viewport.name} shows the first name for a long name and a single name`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await signIn(page, '  Augusto Milano  ')
      await openAccount(page)
      const account = page.getByRole('link', { name: 'Augusto Milano' })
      await expect(account).toBeVisible()
      await expect(account).toContainText('Augusto')
      await expect(account).not.toContainText('Milano')
      await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
      await page.getByRole('button', { name: 'Sign out' }).click()
      await signIn(page, 'Cher')
      await openAccount(page)
      await expect(page.getByRole('link', { name: 'Cher' })).toBeVisible()
    })
  }
})
