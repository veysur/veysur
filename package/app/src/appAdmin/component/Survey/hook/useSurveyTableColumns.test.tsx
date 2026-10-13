import { renderHook } from '@testing-library/react'
import { Survey } from 'veysur-common'

import { useSurveyTableColumns } from './useSurveyTableColumns'

jest.mock('appAdmin/hook', () => ({
  useDisplayTimezone: () => 'UTC',
}))

jest.mock('../SurveyRowAction', () => ({
  SurveyRowAction: () => null,
}))

describe('useSurveyTableColumns', () => {
  const sectionCount = (sectionIds: string[]) => {
    const { result } = renderHook(() => useSurveyTableColumns())
    const column = result.current.find((c) => c.key === 'sections')
    return column?.render(new Survey({ sectionIds }))
  }

  it('shows the number of section ids', () => {
    expect(sectionCount(['welcome', 'group', 'thankYou'])).toBe(3)
  })

  it('never goes negative for a survey with a single section id', () => {
    expect(sectionCount(['group'])).toBe(1)
  })
})
