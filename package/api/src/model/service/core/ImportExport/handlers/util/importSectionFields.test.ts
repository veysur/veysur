import { importSectionFields } from './importSectionFields'

describe('importSectionFields', () => {
  it('drops the legacy elementIds key and keeps the rest', () => {
    const section = {
      _id: 's1',
      surveyId: 'sv',
      kind: 'group',
      elementIds: ['q1'],
    }

    const result = importSectionFields(section)

    expect(result).toEqual({ _id: 's1', surveyId: 'sv', kind: 'group' })
    expect('elementIds' in result).toBe(false)
  })

  it('does not change its input', () => {
    const section = { _id: 's1', elementIds: ['q1'] }

    importSectionFields(section)

    expect(section.elementIds).toEqual(['q1'])
  })
})
