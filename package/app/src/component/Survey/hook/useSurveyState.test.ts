import { act, renderHook } from '@testing-library/react'
import { QUESTION_TYPE_SURVEY_LANG_SELECT, Survey } from 'veysur-common'

import { QUESTION_CODE_LANG } from 'component/constant'

import { useSurveyState, UseSurveyStateProps } from './useSurveyState'

const makeSurvey = (options: string[] = ['en', 'de', 'zh']): Survey =>
  new Survey({
    _id: 's1',
    language: { default: 'en', options },
  })

const makeSurveyWithLangSelectQuestion = (
  options: string[] = ['en', 'de', 'zh'],
): Survey =>
  new Survey({
    _id: 's1',
    language: { default: 'en', options },
    sections: [{ _id: 'g1', code: 'G1', name: { en: 'Group 1' } }],
    elements: [
      {
        _id: 'q1',
        sectionId: 'g1',
        code: 'Q001',
        type: QUESTION_TYPE_SURVEY_LANG_SELECT,
        text: { en: 'Choose a language' },
      },
    ],
  })

describe('useSurveyState', () => {
  it('reflects a language change in answers immediately', () => {
    const { result } = renderHook(() => useSurveyState(undefined))

    expect(result.current.answers[QUESTION_CODE_LANG]).toBe('en')

    act(() => result.current.setLangCurrent('de'))

    expect(result.current.langCurrent).toBe('de')
    expect(result.current.answers[QUESTION_CODE_LANG]).toBe('de')
  })

  it('merges initAnswers arriving after mount without overwriting user answers', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useSurveyState>,
      { initAnswers?: Record<string, unknown> }
    >(({ initAnswers }) => useSurveyState({ survey: undefined, initAnswers }), {
      initialProps: { initAnswers: undefined },
    })

    act(() => result.current.handleAnswerChange('q1', 'user-typed'))
    expect(result.current.answers.q1).toBe('user-typed')

    // Simulate initAnswers loading in from the API after the user has
    // already started answering
    rerender({ initAnswers: { q1: 'from-api', q2: 'from-api' } })

    // Existing user answer for q1 is preserved; q2 is filled in from the load
    expect(result.current.answers.q1).toBe('user-typed')
    expect(result.current.answers.q2).toBe('from-api')
  })

  it('seeds the survey-language question answer, keyed by its own code, with the default language', () => {
    const { result } = renderHook(() =>
      useSurveyState({ survey: makeSurveyWithLangSelectQuestion() }),
    )

    expect(result.current.answers.Q001).toBe('en')
  })

  it('still seeds the survey-language question answer when initAnswers is an empty object (the caller default, not undefined)', () => {
    const { result } = renderHook(() =>
      useSurveyState({
        survey: makeSurveyWithLangSelectQuestion(),
        initAnswers: {},
      }),
    )

    expect(result.current.answers.Q001).toBe('en')
  })

  it('keeps the survey-language question answer in sync when the language changes', () => {
    const { result } = renderHook(() =>
      useSurveyState({ survey: makeSurveyWithLangSelectQuestion() }),
    )

    act(() => result.current.setLangCurrent('de'))

    expect(result.current.answers.Q001).toBe('de')
  })

  describe('participant language reconciliation', () => {
    it('applies the participant language once it arrives after mount, when there is no URL override', () => {
      const { result, rerender } = renderHook<
        ReturnType<typeof useSurveyState>,
        UseSurveyStateProps
      >((props) => useSurveyState(props), {
        initialProps: { survey: makeSurvey() },
      })

      // Mounts on the survey default before the participant fetch resolves
      expect(result.current.langCurrent).toBe('en')

      rerender({ survey: makeSurvey(), participantLanguage: 'zh' })

      expect(result.current.langCurrent).toBe('zh')
    })

    it('does not apply the participant language when a valid ?lang= URL override was given', () => {
      const { result, rerender } = renderHook<
        ReturnType<typeof useSurveyState>,
        UseSurveyStateProps
      >((props) => useSurveyState(props), {
        initialProps: { survey: makeSurvey(), initLanguage: 'de' },
      })

      expect(result.current.langCurrent).toBe('de')

      rerender({
        survey: makeSurvey(),
        initLanguage: 'de',
        participantLanguage: 'zh',
      })

      expect(result.current.langCurrent).toBe('de')
    })

    it('does not clobber a manual language change with a later-arriving participant language', () => {
      const { result, rerender } = renderHook<
        ReturnType<typeof useSurveyState>,
        UseSurveyStateProps
      >((props) => useSurveyState(props), {
        initialProps: { survey: makeSurvey() },
      })

      act(() => result.current.setLangCurrent('de'))
      expect(result.current.langCurrent).toBe('de')

      // Participant language arrives after the manual change - must not override it
      rerender({ survey: makeSurvey(), participantLanguage: 'zh' })

      expect(result.current.langCurrent).toBe('de')
    })

    it('ignores a participant language that is not one of the survey language options', () => {
      const { result, rerender } = renderHook<
        ReturnType<typeof useSurveyState>,
        UseSurveyStateProps
      >((props) => useSurveyState(props), {
        initialProps: { survey: makeSurvey(['en', 'de']) },
      })

      rerender({
        survey: makeSurvey(['en', 'de']),
        participantLanguage: 'zh',
      })

      expect(result.current.langCurrent).toBe('en')
    })
  })
})
