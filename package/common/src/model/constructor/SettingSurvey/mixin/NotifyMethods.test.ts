import { SettingSurvey } from '../../SettingSurvey'

describe('SettingSurvey Notify Methods', () => {
  let surveySetting: SettingSurvey

  beforeEach(() => {
    surveySetting = new SettingSurvey({
      _id: '1',
      notify: {
        basic: 'admin@example.com',
        detailed: 'admin@example.com;manager@example.com',
      },
    })
  })

  describe('setNotifyProperty', () => {
    test('updates basic notification setting', () => {
      const updatedSettingSurvey = surveySetting.setNotifyProperty(
        'basic',
        'new-admin@example.com',
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.notify.basic).toBe('new-admin@example.com')
      expect(surveySetting.notify.basic).toBe('admin@example.com')
    })

    test('returns same instance if setting to current value', () => {
      const updatedSettingSurvey = surveySetting.setNotifyProperty(
        'basic',
        'admin@example.com',
      )

      expect(updatedSettingSurvey).toBe(surveySetting)
      expect(updatedSettingSurvey.notify.basic).toBe('admin@example.com')
    })

    test('preserves other notify properties', () => {
      const updatedSettingSurvey = surveySetting.setNotifyProperty(
        'basic',
        'new-admin@example.com',
      )

      expect(updatedSettingSurvey.notify.detailed).toBe(
        'admin@example.com;manager@example.com',
      )
      expect(updatedSettingSurvey.notify.basic).toBe('new-admin@example.com')
    })

    test('updates detailed notification setting', () => {
      const updatedSettingSurvey = surveySetting.setNotifyProperty(
        'detailed',
        'admin@example.com;manager@example.com;supervisor@example.com',
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.notify.detailed).toBe(
        'admin@example.com;manager@example.com;supervisor@example.com',
      )
      expect(surveySetting.notify.detailed).toBe(
        'admin@example.com;manager@example.com',
      )
    })

    test('can update all properties', () => {
      const updatedSettingSurvey = surveySetting
        .setNotifyProperty('basic', 'new-basic@example.com')
        .setNotifyProperty('detailed', 'new-detailed@example.com')

      expect(updatedSettingSurvey.notify.basic).toBe('new-basic@example.com')
      expect(updatedSettingSurvey.notify.detailed).toBe(
        'new-detailed@example.com',
      )
    })

    test('handles empty string values', () => {
      const updatedSettingSurvey = surveySetting
        .setNotifyProperty('basic', '')
        .setNotifyProperty('detailed', '')

      expect(updatedSettingSurvey.notify.basic).toBe('')
      expect(updatedSettingSurvey.notify.detailed).toBe('')
    })
  })

  describe('updateNotify', () => {
    test('updates multiple notify properties', () => {
      const updates = {
        basic: 'updatedAt-admin@example.com',
        detailed: 'updatedAt-admin@example.com;updatedAt-manager@example.com',
      }
      const updatedSettingSurvey = surveySetting.updateNotify(updates)

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.notify.basic).toBe(
        'updatedAt-admin@example.com',
      )
      expect(updatedSettingSurvey.notify.detailed).toBe(
        'updatedAt-admin@example.com;updatedAt-manager@example.com',
      )
    })

    test('returns same instance if no changes', () => {
      const updates = {
        basic: 'admin@example.com',
        detailed: 'admin@example.com;manager@example.com',
      }
      const updatedSettingSurvey = surveySetting.updateNotify(updates)

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('handles empty updates object', () => {
      const updatedSettingSurvey = surveySetting.updateNotify({})

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('preserves properties not in updates', () => {
      const updates = { basic: 'new-basic@example.com' }
      const updatedSettingSurvey = surveySetting.updateNotify(updates)

      expect(updatedSettingSurvey.notify.basic).toBe('new-basic@example.com')
      expect(updatedSettingSurvey.notify.detailed).toBe(
        'admin@example.com;manager@example.com',
      )
    })

    test('handles partial updates', () => {
      const updates = { detailed: 'only-detailed@example.com' }
      const updatedSettingSurvey = surveySetting.updateNotify(updates)

      expect(updatedSettingSurvey.notify.basic).toBe('admin@example.com')
      expect(updatedSettingSurvey.notify.detailed).toBe(
        'only-detailed@example.com',
      )
    })
  })

  describe('method chaining', () => {
    test('methods can be chained together', () => {
      const updatedSettingSurvey = surveySetting
        .setNotifyProperty('basic', 'chained-basic@example.com')
        .setNotifyProperty('detailed', 'chained-detailed@example.com')

      expect(updatedSettingSurvey.notify.basic).toBe(
        'chained-basic@example.com',
      )
      expect(updatedSettingSurvey.notify.detailed).toBe(
        'chained-detailed@example.com',
      )
    })

    test('immutability is maintained through chaining', () => {
      const updatedSettingSurvey = surveySetting
        .setNotifyProperty('basic', 'chained1@example.com')
        .setNotifyProperty('detailed', 'chained2@example.com')

      expect(surveySetting.notify.basic).toBe('admin@example.com')
      expect(surveySetting.notify.detailed).toBe(
        'admin@example.com;manager@example.com',
      )

      expect(updatedSettingSurvey.notify.basic).toBe('chained1@example.com')
      expect(updatedSettingSurvey.notify.detailed).toBe('chained2@example.com')
    })
  })

  describe('integration with schema defaults', () => {
    test('works with schema default notify structure', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      expect(minimalSettingSurvey.notify.basic).toBe('')
      expect(minimalSettingSurvey.notify.detailed).toBe('')
    })

    test('can modify schema defaults', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      const updatedSettingSurvey = minimalSettingSurvey
        .setNotifyProperty('basic', 'default-admin@example.com')
        .setNotifyProperty('detailed', 'default-detailed@example.com')

      expect(updatedSettingSurvey.notify.basic).toBe(
        'default-admin@example.com',
      )
      expect(updatedSettingSurvey.notify.detailed).toBe(
        'default-detailed@example.com',
      )
    })
  })

  describe('notification configuration scenarios', () => {
    test('basic notifications only', () => {
      const basicOnlySurvey = surveySetting
        .setNotifyProperty('basic', 'basic-only@example.com')
        .setNotifyProperty('detailed', '')

      expect(basicOnlySurvey.notify.basic).toBe('basic-only@example.com')
      expect(basicOnlySurvey.notify.detailed).toBe('')
    })

    test('detailed notifications only', () => {
      const detailedOnlySurvey = surveySetting
        .setNotifyProperty('basic', '')
        .setNotifyProperty('detailed', 'detailed-only@example.com')

      expect(detailedOnlySurvey.notify.basic).toBe('')
      expect(detailedOnlySurvey.notify.detailed).toBe(
        'detailed-only@example.com',
      )
    })

    test('multiple recipients configuration', () => {
      const multiRecipientSurvey = surveySetting.updateNotify({
        basic: 'admin1@example.com;admin2@example.com',
        detailed:
          'manager1@example.com;manager2@example.com;supervisor@example.com',
      })

      expect(multiRecipientSurvey.notify.basic).toBe(
        'admin1@example.com;admin2@example.com',
      )
      expect(multiRecipientSurvey.notify.detailed).toBe(
        'manager1@example.com;manager2@example.com;supervisor@example.com',
      )
    })

    test('placeholder configuration', () => {
      const placeholderSurvey = surveySetting.updateNotify({
        basic: '{ADMIN_EMAIL}',
        detailed: '{ADMIN_EMAIL};{P:EMAIL}',
      })

      expect(placeholderSurvey.notify.basic).toBe('{ADMIN_EMAIL}')
      expect(placeholderSurvey.notify.detailed).toBe('{ADMIN_EMAIL};{P:EMAIL}')
    })

    test('mixed email and placeholder configuration', () => {
      const mixedSurvey = surveySetting.updateNotify({
        basic: 'admin@example.com;{ADMIN_EMAIL}',
        detailed: 'manager@example.com;{P:EMAIL};{A:QUESTION_CODE}',
      })

      expect(mixedSurvey.notify.basic).toBe('admin@example.com;{ADMIN_EMAIL}')
      expect(mixedSurvey.notify.detailed).toBe(
        'manager@example.com;{P:EMAIL};{A:QUESTION_CODE}',
      )
    })

    test('no notifications configuration', () => {
      const noNotificationsSurvey = surveySetting.updateNotify({
        basic: '',
        detailed: '',
      })

      expect(noNotificationsSurvey.notify.basic).toBe('')
      expect(noNotificationsSurvey.notify.detailed).toBe('')
    })
  })

  describe('type safety', () => {
    test('string properties accept string values', () => {
      const updatedSettingSurvey1 = surveySetting.setNotifyProperty(
        'basic',
        'string-test@example.com',
      )
      const updatedSettingSurvey2 = surveySetting.setNotifyProperty(
        'detailed',
        '',
      )

      expect(updatedSettingSurvey1.notify.basic).toBe('string-test@example.com')
      expect(updatedSettingSurvey2.notify.detailed).toBe('')
    })

    test('handles complex recipient strings', () => {
      const complexRecipients = {
        basic: 'admin@example.com;{ADMIN_EMAIL};manager@example.com',
        detailed:
          'supervisor@example.com;{P:ATTRIBUTE_SOME_EMAIL};{A:EMAIL_QUESTION}',
      }
      const updatedSettingSurvey = surveySetting.updateNotify(complexRecipients)

      expect(updatedSettingSurvey.notify.basic).toBe(complexRecipients.basic)
      expect(updatedSettingSurvey.notify.detailed).toBe(
        complexRecipients.detailed,
      )
    })
  })

  describe('edge cases', () => {
    test('handles undefined notify object', () => {
      const surveySettingWithoutNotify = new SettingSurvey({
        _id: '1',
      })

      const updatedSettingSurvey = surveySettingWithoutNotify.setNotifyProperty(
        'basic',
        'test@example.com',
      )

      expect(updatedSettingSurvey.notify.basic).toBe('test@example.com')
      expect(updatedSettingSurvey.notify.detailed).toBe('')
    })

    test('handles very long recipient strings', () => {
      const longRecipients = Array(10)
        .fill(0)
        .map((_, i) => `user${i}@example.com`)
        .join(';')

      const updatedSettingSurvey = surveySetting.setNotifyProperty(
        'detailed',
        longRecipients,
      )

      expect(updatedSettingSurvey.notify.detailed).toBe(longRecipients)
    })

    test('handles special characters in email addresses', () => {
      const specialEmails = 'user+test@example.com;user.name@sub.example.co.uk'
      const updatedSettingSurvey = surveySetting.setNotifyProperty(
        'basic',
        specialEmails,
      )

      expect(updatedSettingSurvey.notify.basic).toBe(specialEmails)
    })
  })
})
