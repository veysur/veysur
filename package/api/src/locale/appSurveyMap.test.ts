import { readFileSync } from 'fs'
import { join } from 'path'

const en: Record<string, string> = JSON.parse(
  readFileSync(join(__dirname, 'en', 'app-survey.json'), 'utf8'),
)

describe('en app-survey map messages', () => {
  test.each([
    'validation.mapLocationInvalid',
    'validation.mapPrecision',
    'validation.mapCountry',
  ])('%s is defined', (key) => {
    expect(en[key]).toBeTruthy()
  })
})
