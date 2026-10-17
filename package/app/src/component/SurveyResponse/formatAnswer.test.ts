import { SurveyQuestion } from 'veysur-common'

import { formatAnswer } from './formatAnswer'

const mapQuestion = { type: 'map' } as unknown as SurveyQuestion

describe('formatAnswer: map', () => {
  it('prefers the address', () => {
    expect(
      formatAnswer(
        { lat: 51.5, lng: -0.12, precision: 'exact', address: 'London, UK' },
        mapQuestion,
        'en',
      ),
    ).toBe('London, UK')
  })

  it('falls back to coordinates', () => {
    expect(
      formatAnswer(
        { lat: 51.5, lng: -0.12, precision: 'exact' },
        mapQuestion,
        'en',
      ),
    ).toBe('51.50000, -0.12000')
  })

  it('marks approximate pins', () => {
    expect(
      formatAnswer(
        { lat: 51.5, lng: -0.1, precision: 'coarse' },
        mapQuestion,
        'en',
      ),
    ).toBe('51.5, -0.1 (approximate)')
  })

  it('shows a dash for a malformed answer', () => {
    expect(formatAnswer({ lat: 'x' }, mapQuestion, 'en')).toBe('—')
  })
})
