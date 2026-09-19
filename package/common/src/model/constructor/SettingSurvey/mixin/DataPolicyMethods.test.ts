// cspell:ignore Texte jour politique confidentialité objet Contenu frnçais
import { SettingSurvey } from '../../SettingSurvey'
import { L10n } from '../../L10n'

describe('SettingSurvey Data Policy Methods', () => {
  let surveySetting: SettingSurvey

  beforeEach(() => {
    surveySetting = new SettingSurvey({
      _id: '1',
      dataPolicy: {
        show: false,
        link: false,
        text: new L10n({ en: 'Data policy text' }),
      },
    })
  })

  describe('setDataPolicyProperty', () => {
    test('updates show setting', () => {
      const updatedSettingSurvey = surveySetting.setDataPolicyProperty(
        'show',
        true,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.dataPolicy.show).toBe(true)
      expect(surveySetting.dataPolicy.show).toBe(false)
    })

    test('returns same instance if setting to current value', () => {
      const updatedSettingSurvey = surveySetting.setDataPolicyProperty(
        'show',
        false,
      )

      expect(updatedSettingSurvey).toBe(surveySetting)
      expect(updatedSettingSurvey.dataPolicy.show).toBe(false)
    })

    test('preserves other data policy properties', () => {
      const updatedSettingSurvey = surveySetting.setDataPolicyProperty(
        'show',
        true,
      )

      expect(updatedSettingSurvey.dataPolicy.link).toBe(false)
      expect(updatedSettingSurvey.dataPolicy.text.en).toBe('Data policy text')
    })

    test('updates link setting', () => {
      const updatedSettingSurvey = surveySetting.setDataPolicyProperty(
        'link',
        true,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.dataPolicy.link).toBe(true)
      expect(surveySetting.dataPolicy.link).toBe(false)
    })

    test('updates text setting', () => {
      const newText = new L10n({
        en: 'Updated data text',
        fr: 'Texte mis à jour',
      })
      const updatedSettingSurvey = surveySetting.setDataPolicyProperty(
        'text',
        newText,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.dataPolicy.text).toBe(newText)
      expect(surveySetting.dataPolicy.text.en).toBe('Data policy text')
    })

    test('can update all properties', () => {
      const updatedSettingSurvey = surveySetting
        .setDataPolicyProperty('show', true)
        .setDataPolicyProperty('link', true)
        .setDataPolicyProperty('text', new L10n({ en: 'New text' }))

      expect(updatedSettingSurvey.dataPolicy.show).toBe(true)
      expect(updatedSettingSurvey.dataPolicy.link).toBe(true)
      expect(updatedSettingSurvey.dataPolicy.text.en).toBe('New text')
    })
  })

  describe('updateDataPolicy', () => {
    test('updates multiple data policy properties', () => {
      const updates = {
        show: true,
        link: true,
        text: new L10n({ en: 'Updated data text' }),
      }
      const updatedSettingSurvey = surveySetting.updateDataPolicy(updates)

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.dataPolicy.show).toBe(true)
      expect(updatedSettingSurvey.dataPolicy.link).toBe(true)
      expect(updatedSettingSurvey.dataPolicy.text.en).toBe('Updated data text')
    })

    test('returns same instance if no changes', () => {
      const updates = {
        show: false,
        link: false,
        text: surveySetting.dataPolicy.text,
      }
      const updatedSettingSurvey = surveySetting.updateDataPolicy(updates)

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('handles empty updates object', () => {
      const updatedSettingSurvey = surveySetting.updateDataPolicy({})

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('preserves properties not in updates', () => {
      const updates = { show: true }
      const updatedSettingSurvey = surveySetting.updateDataPolicy(updates)

      expect(updatedSettingSurvey.dataPolicy.show).toBe(true)
      expect(updatedSettingSurvey.dataPolicy.link).toBe(false)
      expect(updatedSettingSurvey.dataPolicy.text.en).toBe('Data policy text')
    })
  })

  describe('updateDataPolicyText', () => {
    test('updates data policy text for default language', () => {
      const updatedSettingSurvey = surveySetting.updateDataPolicyText(
        'Updated data policy text',
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.dataPolicy.text.en).toBe(
        'Updated data policy text',
      )
      expect(surveySetting.dataPolicy.text.en).toBe('Data policy text')
    })

    test('updates data policy text for specific language', () => {
      const updatedSettingSurvey = surveySetting.updateDataPolicyText(
        'Texte de politique de confidentialité',
        'fr',
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.dataPolicy.text.fr).toBe(
        'Texte de politique de confidentialité',
      )
      expect(updatedSettingSurvey.dataPolicy.text.en).toBe('Data policy text')
    })

    test('returns same instance if setting to current value', () => {
      const updatedSettingSurvey = surveySetting.updateDataPolicyText(
        'Data policy text',
        'en',
      )

      expect(updatedSettingSurvey).toBe(surveySetting)
      expect(updatedSettingSurvey.dataPolicy.text.en).toBe('Data policy text')
    })

    test('preserves other data policy properties', () => {
      const updatedSettingSurvey =
        surveySetting.updateDataPolicyText('New data text')

      expect(updatedSettingSurvey.dataPolicy.show).toBe(false)
      expect(updatedSettingSurvey.dataPolicy.link).toBe(false)
      expect(updatedSettingSurvey.dataPolicy.text.en).toBe('New data text')
    })

    test('preserves other languages in text', () => {
      const multiLangSettingSurvey = surveySetting.updateDataPolicyText(
        'French text',
        'fr',
      )
      const updatedSettingSurvey = multiLangSettingSurvey.updateDataPolicyText(
        'Updated English text',
        'en',
      )

      expect(updatedSettingSurvey.dataPolicy.text.en).toBe(
        'Updated English text',
      )
      expect(updatedSettingSurvey.dataPolicy.text.fr).toBe('French text')
    })

    test('can be chained with other methods', () => {
      const updatedSettingSurvey = surveySetting
        .updateDataPolicyText('New data text')
        .setDataPolicyProperty('show', true)
        .setDataPolicyProperty('link', false)

      expect(updatedSettingSurvey.dataPolicy.text.en).toBe('New data text')
      expect(updatedSettingSurvey.dataPolicy.show).toBe(true)
      expect(updatedSettingSurvey.dataPolicy.link).toBe(false)
    })
  })

  describe('method chaining', () => {
    test('methods can be chained together', () => {
      const updatedSettingSurvey = surveySetting
        .setDataPolicyProperty('show', true)
        .setDataPolicyProperty('link', true)
        .setDataPolicyProperty('text', { en: 'New data text' })

      expect(updatedSettingSurvey.dataPolicy.show).toBe(true)
      expect(updatedSettingSurvey.dataPolicy.link).toBe(true)
      expect(updatedSettingSurvey.dataPolicy.text.en).toBe('New data text')
    })

    test('immutability is maintained through chaining', () => {
      const updatedSettingSurvey = surveySetting
        .setDataPolicyProperty('show', true)
        .setDataPolicyProperty('link', true)

      expect(surveySetting.dataPolicy.show).toBe(false)
      expect(surveySetting.dataPolicy.link).toBe(false)

      expect(updatedSettingSurvey.dataPolicy.show).toBe(true)
      expect(updatedSettingSurvey.dataPolicy.link).toBe(true)
    })
  })

  describe('integration with schema defaults', () => {
    test('works with schema default data policy structure', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      expect(minimalSettingSurvey.dataPolicy.show).toBe(false)
      expect(minimalSettingSurvey.dataPolicy.link).toBe(false)
      expect(minimalSettingSurvey.dataPolicy.text).toBeInstanceOf(L10n)
    })

    test('constructor properly converts plain object text to L10n', () => {
      const surveySettingWithPlainText = new SettingSurvey({
        _id: '1',
        dataPolicy: {
          show: true,
          link: false,
          text: { en: 'Plain object text', fr: 'Texte objet simple' },
        },
      })

      expect(surveySettingWithPlainText.dataPolicy.text).toBeInstanceOf(L10n)
      expect(surveySettingWithPlainText.dataPolicy.text.en).toBe(
        'Plain object text',
      )
      expect(surveySettingWithPlainText.dataPolicy.text.fr).toBe(
        'Texte objet simple',
      )
    })

    test('constructor reuses existing L10n instances', () => {
      const existingText = new L10n({ en: 'Existing L10n text' })
      const surveySettingWithL10nText = new SettingSurvey({
        _id: '1',
        dataPolicy: {
          show: true,
          link: false,
          text: existingText,
        },
      })

      expect(surveySettingWithL10nText.dataPolicy.text).toBe(existingText)
      expect(surveySettingWithL10nText.dataPolicy.text.en).toBe(
        'Existing L10n text',
      )
    })

    test('can modify schema defaults', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      const updatedSettingSurvey = minimalSettingSurvey
        .setDataPolicyProperty('show', true)
        .setDataPolicyProperty('link', true)
        .setDataPolicyProperty('text', new L10n({ en: 'Custom data text' }))

      expect(updatedSettingSurvey.dataPolicy.show).toBe(true)
      expect(updatedSettingSurvey.dataPolicy.link).toBe(true)
      expect(updatedSettingSurvey.dataPolicy.text.en).toBe('Custom data text')
    })
  })

  describe('data policy configuration scenarios', () => {
    test('display only configuration', () => {
      const displayOnlySettingSurvey = surveySetting
        .setDataPolicyProperty('show', true)
        .setDataPolicyProperty('link', false)

      expect(displayOnlySettingSurvey.dataPolicy.show).toBe(true)
      expect(displayOnlySettingSurvey.dataPolicy.link).toBe(false)
      expect(displayOnlySettingSurvey.dataPolicy.text.en).toBe(
        'Data policy text',
      )
    })

    test('external link configuration', () => {
      const linkOnlySettingSurvey = surveySetting
        .setDataPolicyProperty('show', true)
        .setDataPolicyProperty('link', true)

      expect(linkOnlySettingSurvey.dataPolicy.show).toBe(true)
      expect(linkOnlySettingSurvey.dataPolicy.link).toBe(true)
    })

    test('full data policy configuration', () => {
      const fullSettingSurvey = surveySetting.updateDataPolicy({
        show: true,
        link: false,
        text: new L10n({
          en: 'Full data policy content',
          fr: 'Contenu complet',
        }),
      })

      expect(fullSettingSurvey.dataPolicy.show).toBe(true)
      expect(fullSettingSurvey.dataPolicy.link).toBe(false)
      expect(fullSettingSurvey.dataPolicy.text.en).toBe(
        'Full data policy content',
      )
      expect(fullSettingSurvey.dataPolicy.text.fr).toBe('Contenu complet')
    })
  })

  describe('type safety', () => {
    test('boolean properties accept true/false values', () => {
      const updatedSettingSurvey1 = surveySetting.setDataPolicyProperty(
        'show',
        true,
      )
      const updatedSettingSurvey2 = surveySetting.setDataPolicyProperty(
        'link',
        false,
      )

      expect(updatedSettingSurvey1.dataPolicy.show).toBe(true)
      expect(updatedSettingSurvey2.dataPolicy.link).toBe(false)
    })

    test('text property accepts L10n object values', () => {
      const textContent = new L10n({
        en: 'English text',
        fr: 'Texte frnçais',
      })
      const updatedSettingSurvey = surveySetting.setDataPolicyProperty(
        'text',
        textContent,
      )

      expect(updatedSettingSurvey.dataPolicy.text).toBe(textContent)
    })
  })
})
