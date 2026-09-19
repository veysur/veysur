import { Survey, SettingSurvey } from 'veysur-common'

import { useSurveyEditorStore } from './useSurveyEditorStore'

describe('useSurveyEditorStore langDefault seeding', () => {
  beforeEach(() => {
    useSurveyEditorStore.setState({
      survey: undefined,
      surveyAdapter: undefined,
      defaults: new SettingSurvey(),
      langDefault: '',
      langDefaultSeededFor: undefined,
    })
  })

  const survey = (id: string, defaultLang: string) =>
    new Survey({
      _id: id,
      createdById: 'user1',
      language: { default: defaultLang, options: [defaultLang] },
    })

  test('setSurvey seeds langDefault from the survey on first load', () => {
    useSurveyEditorStore.getState().setSurvey(survey('survey1', 'de'))
    expect(useSurveyEditorStore.getState().langDefault).toBe('de')
  })

  test('setSurvey does not overwrite langDefault on a later fetch of the same survey', () => {
    const { setSurvey, setLangDefault } = useSurveyEditorStore.getState()

    setSurvey(survey('survey1', 'de'))
    setLangDefault('fr')

    // A later refetch (e.g. background poll, keepPreviousData transition)
    // resolves with the same survey id but the server's not-yet-persisted
    // default — this must not clobber the explicit user choice.
    setSurvey(survey('survey1', 'de'))

    expect(useSurveyEditorStore.getState().langDefault).toBe('fr')
  })

  test('setSurvey reseeds langDefault when a different survey is loaded', () => {
    const { setSurvey } = useSurveyEditorStore.getState()

    setSurvey(survey('survey1', 'de'))
    setSurvey(survey('survey2', 'es'))

    expect(useSurveyEditorStore.getState().langDefault).toBe('es')
  })

  test('setDefaults does not overwrite an already-seeded langDefault', () => {
    const { setSurvey, setLangDefault, setDefaults } =
      useSurveyEditorStore.getState()

    setSurvey(survey('survey1', 'de'))
    setLangDefault('fr')

    setDefaults(
      new SettingSurvey({ language: { default: 'en', options: ['en'] } }),
    )

    expect(useSurveyEditorStore.getState().langDefault).toBe('fr')
  })
})
