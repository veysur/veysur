import { SettingSurvey } from '../../SettingSurvey'

describe('SettingSurvey Access Methods', () => {
  let surveySetting: SettingSurvey

  beforeEach(() => {
    surveySetting = new SettingSurvey({
      _id: '1',
    })
  })

  describe('setAccessProperty', () => {
    test('updates anonymous setting', () => {
      const updatedSettingSettingSurvey = surveySetting.setAccessProperty(
        'anonymous',
        true,
      )

      expect(updatedSettingSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSettingSurvey.access.anonymous).toBe(true)
      expect(surveySetting.access.anonymous).toBe(false)
    })

    test('returns same instance if setting to current value', () => {
      const updatedSettingSurvey = surveySetting.setAccessProperty(
        'anonymous',
        false,
      )

      expect(updatedSettingSurvey).toBe(surveySetting)
      expect(updatedSettingSurvey.access.anonymous).toBe(false)
    })

    test('preserves other access properties', () => {
      const updatedSettingSurvey = surveySetting.setAccessProperty(
        'anonymous',
        true,
      )

      expect(updatedSettingSurvey.access.open).toBe(false)
      expect(updatedSettingSurvey.access.publicReg).toBe(false)
      expect(updatedSettingSurvey.access.tokenPersist).toBe(true)
    })

    test('can update all boolean properties', () => {
      const booleanProps = [
        'anonymous',
        'open',
        'publicReg',
        'index',
        'tokenPersist',
        'multiple',
        'repeatCookie',
        'resumeLink',
        'captcha',
        'captchaReg',
        'captchaResume',
      ]

      booleanProps.forEach((prop) => {
        const updatedSettingSurvey = surveySetting.setAccessProperty(prop, true)
        expect(updatedSettingSurvey.access[prop]).toBe(true)
      })
    })
  })

  describe('updateAccess', () => {
    test('updates multiple access properties', () => {
      const updates = {
        anonymous: true,
        open: true,
        publicReg: true,
        captcha: true,
      }
      const updatedSettingSurvey = surveySetting.updateAccess(updates)

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.access.anonymous).toBe(true)
      expect(updatedSettingSurvey.access.open).toBe(true)
      expect(updatedSettingSurvey.access.publicReg).toBe(true)
      expect(updatedSettingSurvey.access.captcha).toBe(true)
      expect(updatedSettingSurvey.access.tokenPersist).toBe(true) // preserved
    })

    test('updates partial access properties', () => {
      const updates = { anonymous: true, captcha: true }
      const updatedSettingSurvey = surveySetting.updateAccess(updates)

      expect(updatedSettingSurvey.access.anonymous).toBe(true)
      expect(updatedSettingSurvey.access.captcha).toBe(true)
      expect(updatedSettingSurvey.access.open).toBe(false) // preserved
    })

    test('returns same instance if no changes', () => {
      const updates = {
        anonymous: false,
        open: false,
        tokenPersist: true,
      }
      const updatedSettingSurvey = surveySetting.updateAccess(updates)

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('handles empty updates object', () => {
      const updatedSettingSurvey = surveySetting.updateAccess({})

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('preserves properties not in updates', () => {
      const updates = { anonymous: true }
      const updatedSettingSurvey = surveySetting.updateAccess(updates)

      expect(updatedSettingSurvey.access.anonymous).toBe(true)
      expect(updatedSettingSurvey.access.open).toBe(false)
      expect(updatedSettingSurvey.access.publicReg).toBe(false)
      expect(updatedSettingSurvey.access.tokenPersist).toBe(true)
    })
  })

  describe('method chaining', () => {
    test('methods can be chained together', () => {
      const updatedSettingSurvey = surveySetting
        .setAccessProperty('anonymous', true)
        .setAccessProperty('open', true)
        .setAccessProperty('publicReg', true)
        .setAccessProperty('captcha', true)

      expect(updatedSettingSurvey.access.anonymous).toBe(true)
      expect(updatedSettingSurvey.access.open).toBe(true)
      expect(updatedSettingSurvey.access.publicReg).toBe(true)
      expect(updatedSettingSurvey.access.captcha).toBe(true)
    })

    test('immutability is maintained through chaining', () => {
      const updatedSettingSurvey = surveySetting
        .setAccessProperty('anonymous', true)
        .setAccessProperty('open', true)
        .setAccessProperty('multiple', true)

      expect(surveySetting.access.anonymous).toBe(false)
      expect(surveySetting.access.open).toBe(false)
      expect(surveySetting.access.multiple).toBe(false)

      expect(updatedSettingSurvey.access.anonymous).toBe(true)
      expect(updatedSettingSurvey.access.open).toBe(true)
      expect(updatedSettingSurvey.access.multiple).toBe(true)
    })

    test('complex chaining with conditional changes', () => {
      const updatedSettingSurvey = surveySetting
        .setAccessProperty('anonymous', false) // no change
        .setAccessProperty('open', true) // change
        .setAccessProperty('tokenPersist', true) // no change
        .setAccessProperty('captcha', true) // change

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.access.anonymous).toBe(false)
      expect(updatedSettingSurvey.access.open).toBe(true)
      expect(updatedSettingSurvey.access.tokenPersist).toBe(true)
      expect(updatedSettingSurvey.access.captcha).toBe(true)
    })
  })

  describe('integration with schema defaults', () => {
    test('works with schema default access structure', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      expect(minimalSettingSurvey.access.anonymous).toBe(false)
      expect(minimalSettingSurvey.access.open).toBe(false)
      expect(minimalSettingSurvey.access.publicReg).toBe(false)
      expect(minimalSettingSurvey.access.tokenPersist).toBe(true)
      expect(minimalSettingSurvey.access.captcha).toBe(false)
    })

    test('can modify schema defaults', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      const updatedSettingSurvey = minimalSettingSurvey
        .setAccessProperty('anonymous', true)
        .setAccessProperty('open', true)
        .setAccessProperty('publicReg', true)
        .setAccessProperty('tokenPersist', false)

      expect(updatedSettingSurvey.access.anonymous).toBe(true)
      expect(updatedSettingSurvey.access.open).toBe(true)
      expect(updatedSettingSurvey.access.publicReg).toBe(true)
      expect(updatedSettingSurvey.access.tokenPersist).toBe(false)
    })
  })

  describe('access configuration scenarios', () => {
    test('open surveySetting configuration', () => {
      const openSurvey = surveySetting
        .setAccessProperty('anonymous', true)
        .setAccessProperty('open', true)
        .setAccessProperty('publicReg', true)
        .setAccessProperty('index', true)

      expect(openSurvey.access.anonymous).toBe(true)
      expect(openSurvey.access.open).toBe(true)
      expect(openSurvey.access.publicReg).toBe(true)
      expect(openSurvey.access.index).toBe(true)
    })

    test('anonymous surveySetting configuration', () => {
      const anonymousSurvey = surveySetting
        .setAccessProperty('anonymous', true)
        .setAccessProperty('multiple', false)
        .setAccessProperty('tokenPersist', false)

      expect(anonymousSurvey.access.anonymous).toBe(true)
      expect(anonymousSurvey.access.multiple).toBe(false)
      expect(anonymousSurvey.access.tokenPersist).toBe(false)
    })

    test('high security surveySetting configuration', () => {
      const secureSurvey = surveySetting
        .setAccessProperty('captcha', true)
        .setAccessProperty('captchaReg', true)
        .setAccessProperty('captchaResume', true)
        .setAccessProperty('anonymous', false)

      expect(secureSurvey.access.captcha).toBe(true)
      expect(secureSurvey.access.captchaReg).toBe(true)
      expect(secureSurvey.access.captchaResume).toBe(true)
      expect(secureSurvey.access.anonymous).toBe(false)
    })

    test('flexible response surveySetting configuration', () => {
      const flexibleSurvey = surveySetting
        .setAccessProperty('multiple', true)
        .setAccessProperty('repeatCookie', true)
        .setAccessProperty('resumeLink', true)

      expect(flexibleSurvey.access.multiple).toBe(true)
      expect(flexibleSurvey.access.repeatCookie).toBe(true)
      expect(flexibleSurvey.access.resumeLink).toBe(true)
    })
  })

  describe('edge cases', () => {
    test('multiple updates to same property work correctly', () => {
      const updatedSettingSurvey = surveySetting
        .setAccessProperty('anonymous', true)
        .setAccessProperty('anonymous', false)
        .setAccessProperty('anonymous', true)

      expect(updatedSettingSurvey.access.anonymous).toBe(true)
    })

    test('can toggle all boolean values', () => {
      const toggledSurvey = surveySetting
        .setAccessProperty('anonymous', true)
        .setAccessProperty('open', true)
        .setAccessProperty('tokenPersist', false)

      expect(toggledSurvey.access.anonymous).toBe(true)
      expect(toggledSurvey.access.open).toBe(true)
      expect(toggledSurvey.access.tokenPersist).toBe(false)
    })

    test('updateAccess with single property behaves like individual setter', () => {
      const updatedSettingSurvey1 = surveySetting.setAccessProperty(
        'anonymous',
        true,
      )
      const updatedSettingSurvey2 = surveySetting.updateAccess({
        anonymous: true,
      })

      expect(updatedSettingSurvey1.access.anonymous).toBe(
        updatedSettingSurvey2.access.anonymous,
      )
      expect(updatedSettingSurvey1.access.open).toBe(
        updatedSettingSurvey2.access.open,
      )
      expect(updatedSettingSurvey1.access.publicReg).toBe(
        updatedSettingSurvey2.access.publicReg,
      )
    })
  })

  describe('type safety', () => {
    test('boolean properties accept true/false values', () => {
      const updatedSettingSurvey1 = surveySetting.setAccessProperty(
        'anonymous',
        true,
      )
      const updatedSettingSurvey2 = surveySetting.setAccessProperty(
        'anonymous',
        false,
      )

      expect(updatedSettingSurvey1.access.anonymous).toBe(true)
      expect(updatedSettingSurvey2.access.anonymous).toBe(false)
    })
  })
})
