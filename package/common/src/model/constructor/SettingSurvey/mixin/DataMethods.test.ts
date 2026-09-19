import { SettingSurvey } from '../../SettingSurvey'

describe('SettingSurvey Data Methods', () => {
  let surveySetting: SettingSurvey

  beforeEach(() => {
    surveySetting = new SettingSurvey({
      _id: '1',
    })
  })

  describe('setDataProperty', () => {
    test('updates timestamp setting', () => {
      const updatedSettingSurvey = surveySetting.setDataProperty(
        'timestamp',
        false,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.data.timestamp).toBe(false)
      expect(surveySetting.data.timestamp).toBe(true)
    })

    test('returns same instance if setting to current value', () => {
      const updatedSettingSurvey = surveySetting.setDataProperty(
        'timestamp',
        true,
      )

      expect(updatedSettingSurvey).toBe(surveySetting)
      expect(updatedSettingSurvey.data.timestamp).toBe(true)
    })

    test('preserves other data properties', () => {
      const updatedSettingSurvey = surveySetting.setDataProperty(
        'timestamp',
        false,
      )

      expect(updatedSettingSurvey.data.ip).toBe(false)
      expect(updatedSettingSurvey.data.anonymiseIp).toBe(false)
      expect(updatedSettingSurvey.data.referrerUrl).toBe(false)
    })

    test('can update all boolean properties', () => {
      const booleanProps = [
        'timestamp',
        'ip',
        'anonymiseIp',
        'referrerUrl',
        'timings',
        'assessment',
      ]

      booleanProps.forEach((prop) => {
        const updatedSettingSurvey = surveySetting.setDataProperty(prop, true)
        expect(updatedSettingSurvey.data[prop]).toBe(true)
      })
    })
  })

  describe('updateData', () => {
    test('updates multiple data properties', () => {
      const updates = {
        timestamp: true,
        ip: true,
        anonymiseIp: true,
        timings: true,
      }
      const updatedSettingSurvey = surveySetting.updateData(updates)

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.data.timestamp).toBe(true)
      expect(updatedSettingSurvey.data.ip).toBe(true)
      expect(updatedSettingSurvey.data.anonymiseIp).toBe(true)
      expect(updatedSettingSurvey.data.timings).toBe(true)
      expect(updatedSettingSurvey.data.referrerUrl).toBe(false) // preserved
    })

    test('returns same instance if no changes', () => {
      const updates = {
        timestamp: true,
        ip: false,
        assessment: false,
      }
      const updatedSettingSurvey = surveySetting.updateData(updates)

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('handles empty updates object', () => {
      const updatedSettingSurvey = surveySetting.updateData({})

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('preserves properties not in updates', () => {
      const updates = { timestamp: true }
      const updatedSettingSurvey = surveySetting.updateData(updates)

      expect(updatedSettingSurvey.data.timestamp).toBe(true)
      expect(updatedSettingSurvey.data.ip).toBe(false)
      expect(updatedSettingSurvey.data.anonymiseIp).toBe(false)
      expect(updatedSettingSurvey.data.referrerUrl).toBe(false)
    })
  })

  describe('method chaining', () => {
    test('methods can be chained together', () => {
      const updatedSettingSurvey = surveySetting
        .setDataProperty('timestamp', true)
        .setDataProperty('ip', true)
        .setDataProperty('timings', true)
        .setDataProperty('assessment', true)

      expect(updatedSettingSurvey.data.timestamp).toBe(true)
      expect(updatedSettingSurvey.data.ip).toBe(true)
      expect(updatedSettingSurvey.data.timings).toBe(true)
      expect(updatedSettingSurvey.data.assessment).toBe(true)
    })

    test('immutability is maintained through chaining', () => {
      const updatedSettingSurvey = surveySetting
        .setDataProperty('timestamp', false)
        .setDataProperty('ip', true)
        .setDataProperty('anonymiseIp', true)

      expect(surveySetting.data.timestamp).toBe(true)
      expect(surveySetting.data.ip).toBe(false)
      expect(surveySetting.data.anonymiseIp).toBe(false)

      expect(updatedSettingSurvey.data.timestamp).toBe(false)
      expect(updatedSettingSurvey.data.ip).toBe(true)
      expect(updatedSettingSurvey.data.anonymiseIp).toBe(true)
    })
  })

  describe('integration with schema defaults', () => {
    test('works with schema default data structure', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      expect(minimalSettingSurvey.data.timestamp).toBe(true)
      expect(minimalSettingSurvey.data.ip).toBe(false)
      expect(minimalSettingSurvey.data.anonymiseIp).toBe(false)
      expect(minimalSettingSurvey.data.referrerUrl).toBe(false)
      expect(minimalSettingSurvey.data.timings).toBe(false)
      expect(minimalSettingSurvey.data.assessment).toBe(false)
    })

    test('can modify schema defaults', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      const updatedSettingSurvey = minimalSettingSurvey
        .setDataProperty('timestamp', true)
        .setDataProperty('ip', true)
        .setDataProperty('anonymiseIp', true)
        .setDataProperty('assessment', true)

      expect(updatedSettingSurvey.data.timestamp).toBe(true)
      expect(updatedSettingSurvey.data.ip).toBe(true)
      expect(updatedSettingSurvey.data.anonymiseIp).toBe(true)
      expect(updatedSettingSurvey.data.assessment).toBe(true)
    })
  })

  describe('data tracking scenarios', () => {
    test('full tracking configuration', () => {
      const trackingSettingSurvey = surveySetting
        .setDataProperty('timestamp', true)
        .setDataProperty('ip', true)
        .setDataProperty('referrerUrl', true)
        .setDataProperty('timings', true)

      expect(trackingSettingSurvey.data.timestamp).toBe(true)
      expect(trackingSettingSurvey.data.ip).toBe(true)
      expect(trackingSettingSurvey.data.referrerUrl).toBe(true)
      expect(trackingSettingSurvey.data.timings).toBe(true)
    })

    test('privacy-focused configuration', () => {
      const privateSettingSurvey = surveySetting
        .setDataProperty('timestamp', true)
        .setDataProperty('anonymiseIp', true)
        .setDataProperty('ip', false)
        .setDataProperty('referrerUrl', false)

      expect(privateSettingSurvey.data.timestamp).toBe(true)
      expect(privateSettingSurvey.data.anonymiseIp).toBe(true)
      expect(privateSettingSurvey.data.ip).toBe(false)
      expect(privateSettingSurvey.data.referrerUrl).toBe(false)
    })

    test('assessment tracking configuration', () => {
      const assessmentSettingSurvey = surveySetting
        .setDataProperty('assessment', true)
        .setDataProperty('timings', true)
        .setDataProperty('timestamp', true)

      expect(assessmentSettingSurvey.data.assessment).toBe(true)
      expect(assessmentSettingSurvey.data.timings).toBe(true)
      expect(assessmentSettingSurvey.data.timestamp).toBe(true)
    })
  })

  describe('type safety', () => {
    test('boolean properties accept true/false values', () => {
      const updatedSettingSurvey1 = surveySetting.setDataProperty(
        'timestamp',
        true,
      )
      const updatedSettingSurvey2 = surveySetting.setDataProperty(
        'timestamp',
        false,
      )

      expect(updatedSettingSurvey1.data.timestamp).toBe(true)
      expect(updatedSettingSurvey2.data.timestamp).toBe(false)
    })
  })
})
