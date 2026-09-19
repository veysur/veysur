import { SettingSurvey } from '../../SettingSurvey'

describe('SettingSurvey Presentation Methods', () => {
  let surveySetting: SettingSurvey

  beforeEach(() => {
    surveySetting = new SettingSurvey({
      _id: '1',
      presentation: {
        format: 'group',
        noAnswer: true,
        title: false,
        welcomeMessage: true,
        progressBar: true,
        questionCount: true,
        groupName: false,
        groupDesc: false,
        questionNum: false,
        questionCode: false,
        questionIndex: false,
        backNav: false,
        redirectEnd: false,
        navDelay: 0,
        print: false,
        stats: false,
        noBrand: false,
        thankYouLink: true,
      },
    })
  })

  describe('setPresentationProperty', () => {
    test('updates format property', () => {
      const updatedSettingSurvey = surveySetting.setPresentationProperty(
        'format',
        'question',
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.presentation.format).toBe('question')
      expect(surveySetting.presentation.format).toBe('group')
    })

    test('updates boolean properties', () => {
      const updatedSettingSurvey = surveySetting.setPresentationProperty(
        'noAnswer',
        false,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.presentation.noAnswer).toBe(false)
      expect(surveySetting.presentation.noAnswer).toBe(true)
    })

    test('updates numeric properties', () => {
      const updatedSettingSurvey = surveySetting.setPresentationProperty(
        'navDelay',
        5,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.presentation.navDelay).toBe(5)
      expect(surveySetting.presentation.navDelay).toBe(0)
    })

    test('returns same instance if setting to current value', () => {
      const updatedSettingSurvey = surveySetting.setPresentationProperty(
        'format',
        'group',
      )

      expect(updatedSettingSurvey).toBe(surveySetting)
      expect(updatedSettingSurvey.presentation.format).toBe('group')
    })

    test('preserves other presentation properties', () => {
      const updatedSettingSurvey = surveySetting.setPresentationProperty(
        'format',
        'question',
      )

      expect(updatedSettingSurvey.presentation.noAnswer).toBe(true)
      expect(updatedSettingSurvey.presentation.welcomeMessage).toBe(true)
      expect(updatedSettingSurvey.presentation.progressBar).toBe(true)
    })

    test('can update all boolean properties', () => {
      const booleanProps = [
        'noAnswer',
        'welcomeMessage',
        'progressBar',
        'questionCount',
        'groupName',
        'groupDesc',
        'questionNum',
        'questionCode',
        'questionIndex',
        'backNav',
        'redirectEnd',
        'print',
        'stats',
      ]

      booleanProps.forEach((prop) => {
        const updatedSettingSurvey = surveySetting.setPresentationProperty(
          prop,
          true,
        )
        expect(updatedSettingSurvey.presentation[prop]).toBe(true)
      })
    })

    test('handles floating point values for navDelay', () => {
      const updatedSettingSurvey = surveySetting.setPresentationProperty(
        'navDelay',
        2.5,
      )

      expect(updatedSettingSurvey.presentation.navDelay).toBe(2.5)
    })
  })

  describe('updatePresentation', () => {
    test('updates multiple presentation properties', () => {
      const updates = {
        format: 'question' as const,
        backNav: true,
        navDelay: 5,
        print: true,
      }
      const updatedSettingSurvey = surveySetting.updatePresentation(updates)

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.presentation.format).toBe('question')
      expect(updatedSettingSurvey.presentation.backNav).toBe(true)
      expect(updatedSettingSurvey.presentation.navDelay).toBe(5)
      expect(updatedSettingSurvey.presentation.print).toBe(true)
      expect(updatedSettingSurvey.presentation.noAnswer).toBe(true) // preserved
    })

    test('returns same instance if no changes', () => {
      const updates = {
        format: 'group' as const,
        noAnswer: true,
        navDelay: 0,
      }
      const updatedSettingSurvey = surveySetting.updatePresentation(updates)

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('handles empty updates object', () => {
      const updatedSettingSurvey = surveySetting.updatePresentation({})

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('preserves properties not in updates', () => {
      const updates = { format: 'all' as const }
      const updatedSettingSurvey = surveySetting.updatePresentation(updates)

      expect(updatedSettingSurvey.presentation.format).toBe('all')
      expect(updatedSettingSurvey.presentation.noAnswer).toBe(true)
      expect(updatedSettingSurvey.presentation.welcomeMessage).toBe(true)
      expect(updatedSettingSurvey.presentation.progressBar).toBe(true)
    })
  })

  describe('method chaining', () => {
    test('methods can be chained together', () => {
      const updatedSettingSurvey = surveySetting
        .setPresentationProperty('format', 'question')
        .setPresentationProperty('backNav', true)
        .setPresentationProperty('navDelay', 3)
        .setPresentationProperty('print', true)

      expect(updatedSettingSurvey.presentation.format).toBe('question')
      expect(updatedSettingSurvey.presentation.backNav).toBe(true)
      expect(updatedSettingSurvey.presentation.navDelay).toBe(3)
      expect(updatedSettingSurvey.presentation.print).toBe(true)
    })

    test('immutability is maintained through chaining', () => {
      const updatedSettingSurvey = surveySetting
        .setPresentationProperty('progressBar', false)
        .setPresentationProperty('questionCount', false)
        .setPresentationProperty('groupName', true)

      expect(surveySetting.presentation.progressBar).toBe(true)
      expect(surveySetting.presentation.questionCount).toBe(true)
      expect(surveySetting.presentation.groupName).toBe(false)

      expect(updatedSettingSurvey.presentation.progressBar).toBe(false)
      expect(updatedSettingSurvey.presentation.questionCount).toBe(false)
      expect(updatedSettingSurvey.presentation.groupName).toBe(true)
    })

    test('complex chaining with conditional changes', () => {
      const updatedSettingSurvey = surveySetting
        .setPresentationProperty('format', 'group') // no change
        .setPresentationProperty('backNav', true) // change
        .setPresentationProperty('navDelay', 0) // no change
        .setPresentationProperty('stats', true) // change

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.presentation.format).toBe('group')
      expect(updatedSettingSurvey.presentation.backNav).toBe(true)
      expect(updatedSettingSurvey.presentation.navDelay).toBe(0)
      expect(updatedSettingSurvey.presentation.stats).toBe(true)
    })
  })

  describe('integration with schema defaults', () => {
    test('works with schema default presentation structure', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      expect(minimalSettingSurvey.presentation.format).toBe('group')
      expect(minimalSettingSurvey.presentation.noAnswer).toBe(true)
      expect(minimalSettingSurvey.presentation.welcomeMessage).toBe(false)
      expect(minimalSettingSurvey.presentation.progressBar).toBe(true)
      expect(minimalSettingSurvey.presentation.questionCount).toBe(true)
      expect(minimalSettingSurvey.presentation.navDelay).toBe(0)
    })

    test('can modify schema defaults', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      const updatedSettingSurvey = minimalSettingSurvey
        .setPresentationProperty('format', 'question')
        .setPresentationProperty('noAnswer', false)
        .setPresentationProperty('backNav', true)
        .setPresentationProperty('navDelay', 2)

      expect(updatedSettingSurvey.presentation.format).toBe('question')
      expect(updatedSettingSurvey.presentation.noAnswer).toBe(false)
      expect(updatedSettingSurvey.presentation.backNav).toBe(true)
      expect(updatedSettingSurvey.presentation.navDelay).toBe(2)
    })
  })

  describe('type safety', () => {
    test('format accepts valid values', () => {
      const updatedSettingSurvey1 = surveySetting.setPresentationProperty(
        'format',
        'group',
      )
      const updatedSettingSurvey2 = surveySetting.setPresentationProperty(
        'format',
        'question',
      )
      const updatedSettingSurvey3 = surveySetting.setPresentationProperty(
        'format',
        'all',
      )

      expect(updatedSettingSurvey1.presentation.format).toBe('group')
      expect(updatedSettingSurvey2.presentation.format).toBe('question')
      expect(updatedSettingSurvey3.presentation.format).toBe('all')
    })

    test('boolean properties accept true/false values', () => {
      const updatedSettingSurvey1 = surveySetting.setPresentationProperty(
        'noAnswer',
        true,
      )
      const updatedSettingSurvey2 = surveySetting.setPresentationProperty(
        'noAnswer',
        false,
      )

      expect(updatedSettingSurvey1.presentation.noAnswer).toBe(true)
      expect(updatedSettingSurvey2.presentation.noAnswer).toBe(false)
    })
  })
})
