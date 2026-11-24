import { test, expect } from '@playwright/test'

import { env, loginAsAdmin } from './helpers'

test('the administrator can log in', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page).toHaveURL(/\/admin\/survey/)
})

test('a wrong password is refused', async ({ page }) => {
  await page.goto('/admin/')
  await page.getByPlaceholder('m@example.com').fill(env('ADMIN_EMAIL'))
  await page.locator('input[type="password"]').fill('not-the-password')
  await page.locator('button[type="submit"]').click()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page).not.toHaveURL(/\/admin\/survey/)
})
