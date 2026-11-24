import { test, expect } from '@playwright/test'

import { loginAsAdmin } from './helpers'

test('the administrator creates a survey from the new survey form', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/survey/new')
  await page.getByLabel(/^name/i).fill('Browser test survey')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/admin\/survey\/[^/]+\/edit/)
  await expect(page.getByTestId('save-status')).toBeVisible({ timeout: 60_000 })
})
