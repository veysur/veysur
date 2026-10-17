import { readFileSync } from 'fs'
import { join } from 'path'

const en: Record<string, string> = JSON.parse(
  readFileSync(join(__dirname, 'en', 'app-survey.json'), 'utf8'),
)

describe('en app-survey text format messages', () => {
  test.each([
    'validation.textFormat_email',
    'validation.textFormat_phone',
    'validation.textFormat_url',
    'validation.textFormat_custom',
    'validation.itemInvalidFormat',
  ])('%s is defined', (key) => {
    expect(en[key]).toBeTruthy()
  })

  test('the item message interpolates the label', () => {
    expect(en['validation.itemInvalidFormat']).toContain('{{label}}')
  })
})
