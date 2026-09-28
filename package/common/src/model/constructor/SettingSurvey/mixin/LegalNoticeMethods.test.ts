// cspell:ignore Texte légal jour confidentialité frnçais objet Contenu
import { SettingSurvey } from '../../SettingSurvey'
import { L10n } from '../../L10n'

describe('SettingSurvey Legal Notice Methods', () => {
  let surveySetting: SettingSurvey

  beforeEach(() => {
    surveySetting = new SettingSurvey({
      _id: '1',
      legalNotice: {
        show: false,
        link: false,
        text: new L10n({ en: 'Legal notice text' }),
        url: new L10n(),
      },
    })
  })

  describe('setLegalNoticeProperty', () => {
    test('updates show setting', () => {
      const updatedSettingSurvey = surveySetting.setLegalNoticeProperty(
        'show',
        true,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.legalNotice.show).toBe(true)
      expect(surveySetting.legalNotice.show).toBe(false)
    })

    test('returns same instance if setting to current value', () => {
      const updatedSettingSurvey = surveySetting.setLegalNoticeProperty(
        'show',
        false,
      )

      expect(updatedSettingSurvey).toBe(surveySetting)
      expect(updatedSettingSurvey.legalNotice.show).toBe(false)
    })

    test('preserves other legal notice properties', () => {
      const updatedSettingSurvey = surveySetting.setLegalNoticeProperty(
        'show',
        true,
      )

      expect(updatedSettingSurvey.legalNotice.link).toBe(false)
      expect(updatedSettingSurvey.legalNotice.text.en).toBe('Legal notice text')
    })

    test('updates link setting', () => {
      const updatedSettingSurvey = surveySetting.setLegalNoticeProperty(
        'link',
        true,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.legalNotice.link).toBe(true)
      expect(surveySetting.legalNotice.link).toBe(false)
    })

    test('updates text setting', () => {
      const newText = new L10n({
        en: 'Updated legal notice text',
        fr: "Texte d'avis légal mis à jour",
      })
      const updatedSettingSurvey = surveySetting.setLegalNoticeProperty(
        'text',
        newText,
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.legalNotice.text).toBe(newText)
      expect(surveySetting.legalNotice.text.en).toBe('Legal notice text')
    })

    test('can update all properties', () => {
      const updatedSettingSurvey = surveySetting
        .setLegalNoticeProperty('show', true)
        .setLegalNoticeProperty('link', true)
        .setLegalNoticeProperty('text', new L10n({ en: 'New legal text' }))

      expect(updatedSettingSurvey.legalNotice.show).toBe(true)
      expect(updatedSettingSurvey.legalNotice.link).toBe(true)
      expect(updatedSettingSurvey.legalNotice.text.en).toBe('New legal text')
    })
  })

  describe('updateLegalNotice', () => {
    test('updates multiple legal notice properties', () => {
      const updates = {
        show: true,
        link: true,
        text: new L10n({ en: 'Updated legal notice text' }),
      }
      const updatedSettingSurvey = surveySetting.updateLegalNotice(updates)

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.legalNotice.show).toBe(true)
      expect(updatedSettingSurvey.legalNotice.link).toBe(true)
      expect(updatedSettingSurvey.legalNotice.text.en).toBe(
        'Updated legal notice text',
      )
    })

    test('returns same instance if no changes', () => {
      const updates = {
        show: false,
        link: false,
        text: surveySetting.legalNotice.text,
      }
      const updatedSettingSurvey = surveySetting.updateLegalNotice(updates)

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('handles empty updates object', () => {
      const updatedSettingSurvey = surveySetting.updateLegalNotice({})

      expect(updatedSettingSurvey).toBe(surveySetting)
    })

    test('preserves properties not in updates', () => {
      const updates = { show: true }
      const updatedSettingSurvey = surveySetting.updateLegalNotice(updates)

      expect(updatedSettingSurvey.legalNotice.show).toBe(true)
      expect(updatedSettingSurvey.legalNotice.link).toBe(false)
      expect(updatedSettingSurvey.legalNotice.text.en).toBe('Legal notice text')
    })
  })

  describe('updateLegalNoticeText', () => {
    test('updates legal notice text for default language', () => {
      const updatedSettingSurvey = surveySetting.updateLegalNoticeText(
        'Updated legal notice text',
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.legalNotice.text.en).toBe(
        'Updated legal notice text',
      )
      expect(surveySetting.legalNotice.text.en).toBe('Legal notice text')
    })

    test('updates legal notice text for specific language', () => {
      const updatedSettingSurvey = surveySetting.updateLegalNoticeText(
        "Texte d'avis légal de confidentialité",
        'fr',
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.legalNotice.text.fr).toBe(
        "Texte d'avis légal de confidentialité",
      )
      expect(updatedSettingSurvey.legalNotice.text.en).toBe('Legal notice text')
    })

    test('returns same instance if setting to current value', () => {
      const updatedSettingSurvey = surveySetting.updateLegalNoticeText(
        'Legal notice text',
        'en',
      )

      expect(updatedSettingSurvey).toBe(surveySetting)
      expect(updatedSettingSurvey.legalNotice.text.en).toBe('Legal notice text')
    })

    test('preserves other legal notice properties', () => {
      const updatedSettingSurvey =
        surveySetting.updateLegalNoticeText('New legal text')

      expect(updatedSettingSurvey.legalNotice.show).toBe(false)
      expect(updatedSettingSurvey.legalNotice.link).toBe(false)
      expect(updatedSettingSurvey.legalNotice.text.en).toBe('New legal text')
    })

    test('preserves other languages in text', () => {
      const multiLangSettingSurvey = surveySetting.updateLegalNoticeText(
        'Texte frnçais',
        'fr',
      )
      const updatedSettingSurvey = multiLangSettingSurvey.updateLegalNoticeText(
        'Updated English text',
        'en',
      )

      expect(updatedSettingSurvey.legalNotice.text.en).toBe(
        'Updated English text',
      )
      expect(updatedSettingSurvey.legalNotice.text.fr).toBe('Texte frnçais')
    })

    test('can be chained with other methods', () => {
      const updatedSettingSurvey = surveySetting
        .updateLegalNoticeText('New legal text')
        .setLegalNoticeProperty('show', true)
        .setLegalNoticeProperty('link', false)

      expect(updatedSettingSurvey.legalNotice.text.en).toBe('New legal text')
      expect(updatedSettingSurvey.legalNotice.show).toBe(true)
      expect(updatedSettingSurvey.legalNotice.link).toBe(false)
    })
  })

  describe('updateLegalNoticeUrl', () => {
    test('updates legal notice url for default language', () => {
      const updatedSettingSurvey = surveySetting.updateLegalNoticeUrl(
        'https://example.com/legal-notice',
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.legalNotice.url.en).toBe(
        'https://example.com/legal-notice',
      )
      expect(surveySetting.legalNotice.url.en).toBeFalsy()
    })

    test('updates legal notice url for specific language', () => {
      const updatedSettingSurvey = surveySetting.updateLegalNoticeUrl(
        'https://example.com/fr/legal-notice',
        'fr',
      )

      expect(updatedSettingSurvey).not.toBe(surveySetting)
      expect(updatedSettingSurvey.legalNotice.url.fr).toBe(
        'https://example.com/fr/legal-notice',
      )
    })

    test('returns same instance if setting to current value', () => {
      const withUrl = surveySetting.updateLegalNoticeUrl(
        'https://example.com/legal-notice',
      )
      const updatedSettingSurvey = withUrl.updateLegalNoticeUrl(
        'https://example.com/legal-notice',
      )

      expect(updatedSettingSurvey).toBe(withUrl)
    })

    test('preserves other legal notice properties', () => {
      const updatedSettingSurvey = surveySetting.updateLegalNoticeUrl(
        'https://example.com/legal-notice',
      )

      expect(updatedSettingSurvey.legalNotice.show).toBe(false)
      expect(updatedSettingSurvey.legalNotice.link).toBe(false)
      expect(updatedSettingSurvey.legalNotice.text.en).toBe('Legal notice text')
    })

    test('preserves other languages in url', () => {
      const multiLangSettingSurvey = surveySetting.updateLegalNoticeUrl(
        'https://example.com/fr/legal-notice',
        'fr',
      )
      const updatedSettingSurvey = multiLangSettingSurvey.updateLegalNoticeUrl(
        'https://example.com/en/legal-notice',
        'en',
      )

      expect(updatedSettingSurvey.legalNotice.url.en).toBe(
        'https://example.com/en/legal-notice',
      )
      expect(updatedSettingSurvey.legalNotice.url.fr).toBe(
        'https://example.com/fr/legal-notice',
      )
    })
  })

  describe('method chaining', () => {
    test('methods can be chained together', () => {
      const updatedSettingSurvey = surveySetting
        .setLegalNoticeProperty('show', true)
        .setLegalNoticeProperty('link', true)
        .setLegalNoticeProperty('text', new L10n({ en: 'New legal text' }))

      expect(updatedSettingSurvey.legalNotice.show).toBe(true)
      expect(updatedSettingSurvey.legalNotice.link).toBe(true)
      expect(updatedSettingSurvey.legalNotice.text.en).toBe('New legal text')
    })

    test('immutability is maintained through chaining', () => {
      const updatedSettingSurvey = surveySetting
        .setLegalNoticeProperty('show', true)
        .setLegalNoticeProperty('link', true)

      expect(surveySetting.legalNotice.show).toBe(false)
      expect(surveySetting.legalNotice.link).toBe(false)

      expect(updatedSettingSurvey.legalNotice.show).toBe(true)
      expect(updatedSettingSurvey.legalNotice.link).toBe(true)
    })
  })

  describe('integration with schema defaults', () => {
    test('works with schema default legal notice structure', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      expect(minimalSettingSurvey.legalNotice.show).toBe(false)
      expect(minimalSettingSurvey.legalNotice.link).toBe(false)
      expect(minimalSettingSurvey.legalNotice.text).toBeInstanceOf(L10n)
    })

    test('constructor properly converts plain object text to L10n', () => {
      const surveySettingWithPlainText = new SettingSurvey({
        _id: '1',
        legalNotice: {
          show: true,
          link: false,
          text: {
            en: 'Plain object legal text',
            fr: 'Texte légal objet simple',
          },
          url: new L10n(),
        },
      })

      expect(surveySettingWithPlainText.legalNotice.text).toBeInstanceOf(L10n)
      expect(surveySettingWithPlainText.legalNotice.text.en).toBe(
        'Plain object legal text',
      )
      expect(surveySettingWithPlainText.legalNotice.text.fr).toBe(
        'Texte légal objet simple',
      )
    })

    test('constructor reuses existing L10n instances', () => {
      const existingText = new L10n({ en: 'Existing L10n legal text' })
      const surveySettingWithL10nText = new SettingSurvey({
        _id: '1',
        legalNotice: {
          show: true,
          link: false,
          text: existingText,
          url: new L10n(),
        },
      })

      expect(surveySettingWithL10nText.legalNotice.text).toBe(existingText)
      expect(surveySettingWithL10nText.legalNotice.text.en).toBe(
        'Existing L10n legal text',
      )
    })

    test('constructor properly converts plain object url to L10n', () => {
      const surveySettingWithPlainUrl = new SettingSurvey({
        _id: '1',
        legalNotice: {
          show: true,
          link: true,
          text: new L10n(),
          url: { en: 'https://example.com/legal-notice' },
        },
      })

      expect(surveySettingWithPlainUrl.legalNotice.url).toBeInstanceOf(L10n)
      expect(surveySettingWithPlainUrl.legalNotice.url.en).toBe(
        'https://example.com/legal-notice',
      )
    })

    test('constructor reuses existing L10n instances for url', () => {
      const existingUrl = new L10n({ en: 'https://example.com/legal-notice' })
      const surveySettingWithL10nUrl = new SettingSurvey({
        _id: '1',
        legalNotice: {
          show: true,
          link: true,
          text: new L10n(),
          url: existingUrl,
        },
      })

      expect(surveySettingWithL10nUrl.legalNotice.url).toBe(existingUrl)
    })

    test('can modify schema defaults', () => {
      const minimalSettingSurvey = new SettingSurvey({
        _id: '1',
      })

      const updatedSettingSurvey = minimalSettingSurvey
        .setLegalNoticeProperty('show', true)
        .setLegalNoticeProperty('link', true)
        .setLegalNoticeProperty(
          'text',
          new L10n({ en: 'Custom legal notice text' }),
        )

      expect(updatedSettingSurvey.legalNotice.show).toBe(true)
      expect(updatedSettingSurvey.legalNotice.link).toBe(true)
      expect(updatedSettingSurvey.legalNotice.text.en).toBe(
        'Custom legal notice text',
      )
    })
  })

  describe('legal notice configuration scenarios', () => {
    test('display only configuration', () => {
      const displayOnlySettingSurvey = surveySetting
        .setLegalNoticeProperty('show', true)
        .setLegalNoticeProperty('link', false)

      expect(displayOnlySettingSurvey.legalNotice.show).toBe(true)
      expect(displayOnlySettingSurvey.legalNotice.link).toBe(false)
      expect(displayOnlySettingSurvey.legalNotice.text.en).toBe(
        'Legal notice text',
      )
    })

    test('external link configuration', () => {
      const linkOnlySettingSurvey = surveySetting
        .setLegalNoticeProperty('show', true)
        .setLegalNoticeProperty('link', true)

      expect(linkOnlySettingSurvey.legalNotice.show).toBe(true)
      expect(linkOnlySettingSurvey.legalNotice.link).toBe(true)
    })

    test('full legal notice configuration', () => {
      const fullSettingSurvey = surveySetting.updateLegalNotice({
        show: true,
        link: false,
        text: new L10n({
          en: 'Full legal notice content',
          fr: "Contenu d'avis légal complet",
        }),
      })

      expect(fullSettingSurvey.legalNotice.show).toBe(true)
      expect(fullSettingSurvey.legalNotice.link).toBe(false)
      expect(fullSettingSurvey.legalNotice.text.en).toBe(
        'Full legal notice content',
      )
      expect(fullSettingSurvey.legalNotice.text.fr).toBe(
        "Contenu d'avis légal complet",
      )
    })
  })

  describe('type safety', () => {
    test('boolean properties accept true/false values', () => {
      const updatedSettingSurvey1 = surveySetting.setLegalNoticeProperty(
        'show',
        true,
      )
      const updatedSettingSurvey2 = surveySetting.setLegalNoticeProperty(
        'link',
        false,
      )

      expect(updatedSettingSurvey1.legalNotice.show).toBe(true)
      expect(updatedSettingSurvey2.legalNotice.link).toBe(false)
    })

    test('text property accepts L10n object values', () => {
      const textContent = new L10n({
        en: 'English legal text',
        fr: 'Texte légal frnçais',
      })
      const updatedSettingSurvey = surveySetting.setLegalNoticeProperty(
        'text',
        textContent,
      )

      expect(updatedSettingSurvey.legalNotice.text).toBe(textContent)
    })
  })
})
