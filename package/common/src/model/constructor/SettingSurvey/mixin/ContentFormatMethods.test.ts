import { SettingSurvey } from '../../SettingSurvey'

describe('SettingSurvey Content Format Methods', () => {
  let surveySetting: SettingSurvey

  beforeEach(() => {
    surveySetting = new SettingSurvey({
      _id: '1',
    })
  })

  describe('defaults', () => {
    test('has expected default values', () => {
      expect(surveySetting.contentFormat.htmlAllowed).toBe(false)
      expect(surveySetting.contentFormat.markdownAllowed).toBe(true)
      expect(surveySetting.contentFormat.scriptTagsAllowed).toBe(false)
    })
  })

  describe('setContentFormatProperty', () => {
    test('updates htmlAllowed setting', () => {
      const updated = surveySetting.setContentFormatProperty(
        'htmlAllowed',
        true,
      )

      expect(updated).not.toBe(surveySetting)
      expect(updated.contentFormat.htmlAllowed).toBe(true)
      expect(surveySetting.contentFormat.htmlAllowed).toBe(false)
    })

    test('returns same instance if setting to current value', () => {
      const updated = surveySetting.setContentFormatProperty(
        'markdownAllowed',
        true,
      )

      expect(updated).toBe(surveySetting)
      expect(updated.contentFormat.markdownAllowed).toBe(true)
    })

    test('preserves other content properties', () => {
      const updated = surveySetting.setContentFormatProperty(
        'htmlAllowed',
        true,
      )

      expect(updated.contentFormat.markdownAllowed).toBe(true)
      expect(updated.contentFormat.scriptTagsAllowed).toBe(false)
    })

    test('can update scriptTagsAllowed', () => {
      const updated = surveySetting.setContentFormatProperty(
        'scriptTagsAllowed',
        true,
      )

      expect(updated.contentFormat.scriptTagsAllowed).toBe(true)
    })
  })

  describe('updateContentFormat', () => {
    test('updates multiple content properties', () => {
      const updates = { htmlAllowed: true, scriptTagsAllowed: true }
      const updated = surveySetting.updateContentFormat(updates)

      expect(updated).not.toBe(surveySetting)
      expect(updated.contentFormat.htmlAllowed).toBe(true)
      expect(updated.contentFormat.scriptTagsAllowed).toBe(true)
      expect(updated.contentFormat.markdownAllowed).toBe(true) // preserved
    })

    test('returns same instance if no changes', () => {
      const updated = surveySetting.updateContentFormat({
        markdownAllowed: true,
        htmlAllowed: false,
      })

      expect(updated).toBe(surveySetting)
    })

    test('handles empty updates object', () => {
      const updated = surveySetting.updateContentFormat({})

      expect(updated).toBe(surveySetting)
    })
  })

  describe('method chaining', () => {
    test('methods can be chained together', () => {
      const updated = surveySetting
        .setContentFormatProperty('htmlAllowed', true)
        .setContentFormatProperty('markdownAllowed', false)
        .setContentFormatProperty('scriptTagsAllowed', true)

      expect(updated.contentFormat.htmlAllowed).toBe(true)
      expect(updated.contentFormat.markdownAllowed).toBe(false)
      expect(updated.contentFormat.scriptTagsAllowed).toBe(true)
    })

    test('immutability is maintained through chaining', () => {
      const updated = surveySetting
        .setContentFormatProperty('htmlAllowed', true)
        .setContentFormatProperty('scriptTagsAllowed', true)

      expect(surveySetting.contentFormat.htmlAllowed).toBe(false)
      expect(surveySetting.contentFormat.scriptTagsAllowed).toBe(false)

      expect(updated.contentFormat.htmlAllowed).toBe(true)
      expect(updated.contentFormat.scriptTagsAllowed).toBe(true)
    })
  })
})
