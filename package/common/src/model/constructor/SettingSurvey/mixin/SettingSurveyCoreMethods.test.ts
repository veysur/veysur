// cspell:ignore Politique confidentialité
import { SettingSurveyCoreMethods } from './SettingSurveyCoreMethods'
import { L10n } from '../../L10n'

class TestBase {
  dataPolicy: {
    text: L10n
    link: {
      text: L10n
      url: string
    }
  } = {
    text: new L10n({ en: 'Data Policy' }),
    link: {
      text: new L10n({ en: 'Read more' }),
      url: '',
    },
  }

  constructor(data?: {
    dataPolicy?: {
      text?: L10n
      link?: { text?: L10n; url?: string }
    }
  }) {
    if (data?.dataPolicy) {
      this.dataPolicy = {
        ...this.dataPolicy,
        ...data.dataPolicy,
        link: {
          ...this.dataPolicy.link,
          ...data.dataPolicy.link,
        },
      }
    }
  }

  newInstance(changes?: Record<string, unknown>): this {
    if (!changes || Object.keys(changes).length === 0) {
      return this
    }
    const Ctor = this.constructor as new (data: unknown) => this
    return new Ctor({ ...this, ...changes })
  }
}

const TestClass = SettingSurveyCoreMethods(TestBase)

describe('SettingSurveyCoreMethods', () => {
  let instance: InstanceType<typeof TestClass>

  beforeEach(() => {
    instance = new TestClass()
  })

  describe('updateL10nProperty', () => {
    describe('simple L10n property', () => {
      it('should remove language value when set to null', () => {
        // Setup: Create instance with multiple language values
        instance = new TestClass({
          dataPolicy: {
            text: new L10n({
              en: 'Data Policy',
              fr: 'Politique de confidentialité',
            }),
            link: {
              text: new L10n({ en: 'Read more' }),
              url: '',
            },
          },
        })

        // Act: Set French text to null
        const result = instance.updateL10nProperty(
          instance.dataPolicy,
          'dataPolicy',
          'text',
          null,
          'fr',
        )

        // Assert: French value should be removed, English should remain
        expect(result).toBeInstanceOf(TestClass)
        expect(result).not.toBe(instance)
        expect(result.dataPolicy.text.en).toBe('Data Policy')
        expect(result.dataPolicy.text.fr).toBeUndefined()
        expect(
          Object.prototype.hasOwnProperty.call(result.dataPolicy.text, 'fr'),
        ).toBe(false)
      })

      it('should update text when not null', () => {
        const result = instance.updateL10nProperty(
          instance.dataPolicy,
          'dataPolicy',
          'text',
          'Updated Data Policy',
          'en',
        )

        expect(result.dataPolicy.text.en).toBe('Updated Data Policy')
      })

      it('should return same instance when setting same value', () => {
        const result = instance.updateL10nProperty(
          instance.dataPolicy,
          'dataPolicy',
          'text',
          'Data Policy',
          'en',
        )

        expect(result).toBe(instance)
      })
    })

    describe('nested L10n property', () => {
      it('should remove language value from nested property when set to null', () => {
        // Setup: Create instance with multiple language values in nested property
        instance = new TestClass({
          dataPolicy: {
            text: new L10n({ en: 'Data Policy' }),
            link: {
              text: new L10n({
                en: 'Read more',
                fr: 'Lire la suite',
                es: 'Leer más',
              }),
              url: 'https://example.com',
            },
          },
        })

        // Act: Set French link text to null
        const result = instance.updateL10nProperty(
          instance.dataPolicy,
          'dataPolicy',
          'link.text',
          null,
          'fr',
        )

        // Assert: French value should be removed, other languages should remain
        expect(result).toBeInstanceOf(TestClass)
        expect(result).not.toBe(instance)
        expect(result.dataPolicy.link.text.en).toBe('Read more')
        expect(result.dataPolicy.link.text.es).toBe('Leer más')
        expect(result.dataPolicy.link.text.fr).toBeUndefined()
        expect(
          Object.prototype.hasOwnProperty.call(
            result.dataPolicy.link.text,
            'fr',
          ),
        ).toBe(false)
        // Verify URL is preserved
        expect(result.dataPolicy.link.url).toBe('https://example.com')
      })

      it('should update nested text when not null', () => {
        const result = instance.updateL10nProperty(
          instance.dataPolicy,
          'dataPolicy',
          'link.text',
          'Learn more',
          'en',
        )

        expect(result.dataPolicy.link.text.en).toBe('Learn more')
      })

      it('should return same instance when setting same nested value', () => {
        const result = instance.updateL10nProperty(
          instance.dataPolicy,
          'dataPolicy',
          'link.text',
          'Read more',
          'en',
        )

        expect(result).toBe(instance)
      })
    })

    describe('edge cases', () => {
      it('should handle removing the only language value', () => {
        // Setup: Instance with only English
        instance = new TestClass({
          dataPolicy: {
            text: new L10n({ en: 'Data Policy' }),
            link: {
              text: new L10n({ en: 'Read more' }),
              url: '',
            },
          },
        })

        // Act: Remove the only language
        const result = instance.updateL10nProperty(
          instance.dataPolicy,
          'dataPolicy',
          'text',
          null,
          'en',
        )

        // Assert: Property should be removed
        expect(result.dataPolicy.text.en).toBeUndefined()
        expect(
          Object.prototype.hasOwnProperty.call(result.dataPolicy.text, 'en'),
        ).toBe(false)
      })

      it('should handle setting null for non-existent language', () => {
        const result = instance.updateL10nProperty(
          instance.dataPolicy,
          'dataPolicy',
          'text',
          null,
          'de',
        )

        // Should return new instance even though language doesn't exist
        // because undefined !== null, so the method creates a new L10n instance
        expect(result).not.toBe(instance)
        expect(result.dataPolicy.text.de).toBeUndefined()
        expect(
          Object.prototype.hasOwnProperty.call(result.dataPolicy.text, 'de'),
        ).toBe(false)
        expect(result.dataPolicy.text.en).toBe('Data Policy')
      })

      it('should preserve other properties when removing language', () => {
        instance = new TestClass({
          dataPolicy: {
            text: new L10n({ en: 'Data Policy', fr: 'Politique' }),
            link: {
              text: new L10n({ en: 'Read more', fr: 'Lire' }),
              url: 'https://example.com',
            },
          },
        })

        const result = instance.updateL10nProperty(
          instance.dataPolicy,
          'dataPolicy',
          'text',
          null,
          'fr',
        )

        // Verify link is preserved
        expect(result.dataPolicy.link.text.en).toBe('Read more')
        expect(result.dataPolicy.link.text.fr).toBe('Lire')
        expect(result.dataPolicy.link.url).toBe('https://example.com')
      })
    })
  })
})
