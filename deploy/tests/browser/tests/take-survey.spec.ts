import { test, expect } from '@playwright/test'

import { env } from './helpers'

test('a participant answers the published survey', async ({ page }) => {
  await page.goto(`/survey/${env('SURVEY_ID')}`)
  const answer = page.getByPlaceholder('Type your answer here')
  await expect(answer).toBeVisible()
  await answer.fill('Answered in the browser')

  const saved = page.waitForResponse((r) => r.url().includes('/survey-participant-response/') && r.request().method() !== 'GET' && r.ok())
  await page.locator('.survey-submit-btn').click()
  await saved
  await expect(page.locator('.survey-submit-btn')).toBeHidden()
})
