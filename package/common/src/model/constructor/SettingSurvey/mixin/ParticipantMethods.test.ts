import { SettingSurvey } from '../../SettingSurvey'

describe('SettingSurvey Participant Methods', () => {
  let surveySetting: SettingSurvey

  beforeEach(() => {
    surveySetting = new SettingSurvey({
      _id: '1',
      participant: {
        htmlEmail: true,
        thankYouEmail: true,
        tokenLength: 16,
      },
    })
  })

  describe('setParticipantProperty', () => {
    test('updates htmlEmail setting', () => {
      const updatedSettingSurvey = surveySetting.setParticipantProperty(
        'htmlEmail',
        false,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.participant.htmlEmail).toBe(false)
      expect(surveySetting.participant.htmlEmail).toBe(true)
    })

    test('returns same instance if setting to current value', () => {
      const updatedSettingSurvey = surveySetting.setParticipantProperty(
        'htmlEmail',
        true,
      )

      expect(updatedSettingSurvey).toBe(surveySetting)
      expect(updatedSettingSurvey.participant.htmlEmail).toBe(true)
    })

    test('preserves other participant properties', () => {
      const updatedSettingSurvey = surveySetting.setParticipantProperty(
        'htmlEmail',
        false,
      )

      expect(updatedSettingSurvey.participant.thankYouEmail).toBe(true)
      expect(updatedSettingSurvey.participant.tokenLength).toBe(16)
    })

    test('updates thankYouEmail setting', () => {
      const updatedSettingSurvey = surveySetting.setParticipantProperty(
        'thankYouEmail',
        false,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.participant.thankYouEmail).toBe(false)
      expect(surveySetting.participant.thankYouEmail).toBe(true)
    })

    test('updates tokenLength setting', () => {
      const updatedSettingSurvey = surveySetting.setParticipantProperty(
        'tokenLength',
        32,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.participant.tokenLength).toBe(32)
      expect(surveySetting.participant.tokenLength).toBe(16)
    })

    test('can update all properties', () => {
      const updatedSettingSurvey = surveySetting
        .setParticipantProperty('htmlEmail', false)
        .setParticipantProperty('thankYouEmail', false)
        .setParticipantProperty('tokenLength', 32)

      expect(updatedSettingSurvey.participant.htmlEmail).toBe(false)
      expect(updatedSettingSurvey.participant.thankYouEmail).toBe(false)
      expect(updatedSettingSurvey.participant.tokenLength).toBe(32)
    })
  })

  describe('updateParticipant', () => {
    test('updates multiple participant properties', () => {
      const updates = {
        htmlEmail: false,
        thankYouEmail: false,
        tokenLength: 32,
      }
      const updatedSettingSurvey = surveySetting.updateParticipant(updates)

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.participant.htmlEmail).toBe(false)
      expect(updatedSettingSurvey.participant.thankYouEmail).toBe(false)
      expect(updatedSettingSurvey.participant.tokenLength).toBe(32)
    })

    test('returns same instance if no changes', () => {
      const updates = {
        htmlEmail: true,
        thankYouEmail: true,
        tokenLength: 16,
      }
      const updatedSettingSurvey = surveySetting.updateParticipant(updates)

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('handles empty updates object', () => {
      const updatedSettingSurvey = surveySetting.updateParticipant({})

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('preserves properties not in updates', () => {
      const updates = { htmlEmail: false }
      const updatedSettingSurvey = surveySetting.updateParticipant(updates)

      expect(updatedSettingSurvey.participant.htmlEmail).toBe(false)
      expect(updatedSettingSurvey.participant.thankYouEmail).toBe(true)
      expect(updatedSettingSurvey.participant.tokenLength).toBe(16)
    })
  })

  describe('method chaining', () => {
    test('methods can be chained together', () => {
      const updatedSettingSurvey = surveySetting
        .setParticipantProperty('htmlEmail', false)
        .setParticipantProperty('thankYouEmail', false)
        .setParticipantProperty('tokenLength', 32)

      expect(updatedSettingSurvey.participant.htmlEmail).toBe(false)
      expect(updatedSettingSurvey.participant.thankYouEmail).toBe(false)
      expect(updatedSettingSurvey.participant.tokenLength).toBe(32)
    })

    test('immutability is maintained through chaining', () => {
      const updatedSettingSurvey = surveySetting
        .setParticipantProperty('htmlEmail', false)
        .setParticipantProperty('tokenLength', 8)

      expect(surveySetting.participant.htmlEmail).toBe(true)
      expect(surveySetting.participant.tokenLength).toBe(16)

      expect(updatedSettingSurvey.participant.htmlEmail).toBe(false)
      expect(updatedSettingSurvey.participant.tokenLength).toBe(8)
    })
  })

  describe('integration with schema defaults', () => {
    test('works with schema default participant structure', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      expect(minimalSettingSurvey.participant.htmlEmail).toBe(true)
      expect(minimalSettingSurvey.participant.thankYouEmail).toBe(true)
      expect(minimalSettingSurvey.participant.tokenLength).toBe(16)
    })

    test('can modify schema defaults', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      const updatedSettingSurvey = minimalSettingSurvey
        .setParticipantProperty('htmlEmail', false)
        .setParticipantProperty('thankYouEmail', false)
        .setParticipantProperty('tokenLength', 32)

      expect(updatedSettingSurvey.participant.htmlEmail).toBe(false)
      expect(updatedSettingSurvey.participant.thankYouEmail).toBe(false)
      expect(updatedSettingSurvey.participant.tokenLength).toBe(32)
    })
  })

  describe('participant configuration scenarios', () => {
    test('minimal email configuration', () => {
      const minimalSettingSurvey = surveySetting
        .setParticipantProperty('htmlEmail', false)
        .setParticipantProperty('thankYouEmail', false)

      expect(minimalSettingSurvey.participant.htmlEmail).toBe(false)
      expect(minimalSettingSurvey.participant.thankYouEmail).toBe(false)
      expect(minimalSettingSurvey.participant.tokenLength).toBe(16) // preserved
    })

    test('high security configuration', () => {
      const secureSurvey = surveySetting.setParticipantProperty(
        'tokenLength',
        64,
      )

      expect(secureSurvey.participant.tokenLength).toBe(64)
      expect(secureSurvey.participant.htmlEmail).toBe(true)
      expect(secureSurvey.participant.thankYouEmail).toBe(true)
    })

    test('low security configuration', () => {
      const simpleSurvey = surveySetting.setParticipantProperty(
        'tokenLength',
        8,
      )

      expect(simpleSurvey.participant.tokenLength).toBe(8)
    })
  })

  describe('type safety', () => {
    test('boolean properties accept true/false values', () => {
      const updatedSettingSurvey1 = surveySetting.setParticipantProperty(
        'htmlEmail',
        true,
      )
      const updatedSettingSurvey2 = surveySetting.setParticipantProperty(
        'htmlEmail',
        false,
      )

      expect(updatedSettingSurvey1.participant.htmlEmail).toBe(true)
      expect(updatedSettingSurvey2.participant.htmlEmail).toBe(false)
    })

    test('numeric properties accept number values', () => {
      const updatedSettingSurvey = surveySetting.setParticipantProperty(
        'tokenLength',
        24,
      )

      expect(updatedSettingSurvey.participant.tokenLength).toBe(24)
    })
  })
})
