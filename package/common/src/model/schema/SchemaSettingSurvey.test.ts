import { Schema } from '@datacapy/schema'

import {
  ALL_CHART_TYPES,
  ALL_CHART_VALUE_MODES,
} from '../constructor/SettingSurvey/SettingSurveyBase'
import { SchemaSettingSurvey } from './SchemaSettingSurvey'

describe('SchemaSettingSurvey stats whitelist', () => {
  const schema = new SchemaSettingSurvey()
  const questionSpec = schema.spec.stats.questions['*']

  test('chartType is constrained to ALL_CHART_TYPES', () => {
    expect(questionSpec.chartType.$validate.inArray.values).toEqual(
      ALL_CHART_TYPES,
    )
  })

  test('valueMode is constrained to ALL_CHART_VALUE_MODES', () => {
    expect(questionSpec.valueMode.$validate.inArray.values).toEqual(
      ALL_CHART_VALUE_MODES,
    )
  })

  test('valueMode is not required (no .required validator)', () => {
    expect(questionSpec.valueMode.$validate?.required).toBeUndefined()
  })
})

describe('SchemaSettingSurvey access.embedDomains', () => {
  const schema = new Schema({
    embedDomains: new SchemaSettingSurvey().spec.access.embedDomains,
  })
  const filter = async (embedDomains?: string[] | null) => {
    const data: { embedDomains?: string[] | null } = { embedDomains }
    await schema.applyFilters(data)
    return data.embedDomains
  }

  test('keeps an empty list so a survey can override a restrictive default', async () => {
    expect(await filter([])).toEqual([])
  })

  test('keeps null as inherit', async () => {
    expect(await filter(null)).toBeNull()
  })
})
