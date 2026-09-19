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
