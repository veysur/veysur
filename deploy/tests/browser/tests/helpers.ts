import { expect, type Page } from '@playwright/test'

export function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set; run these tests through deploy/tests/release-smoke.sh --browser`)
  return value
}

/** Logs in through the admin login form and waits for the survey list. The proof of work runs in the page. */
export async function loginAsAdmin(page: Page) {
  await page.goto('/admin/')
  await page.getByPlaceholder('m@example.com').fill(env('ADMIN_EMAIL'))
  await page.locator('input[type="password"]').fill(env('ADMIN_PASSWORD'))
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/admin\/survey/, { timeout: 60_000 })
}
