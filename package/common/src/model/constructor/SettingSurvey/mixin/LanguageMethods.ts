import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultLanguage = {
  default: 'en',
  options: ['en'],
}

export function LanguageMethods<T extends Constructor<SettingSurveyMixinBase>>(
  Base: T,
) {
  return class extends Base {
    setLanguageProperty(key: string, value: unknown): this {
      return this.setNestedProperty(
        this.language,
        defaultLanguage,
        'language',
        key,
        value,
      )
    }

    addLanguageOption(language: string): this {
      const options = this.language?.options ?? []
      if (options.includes(language)) {
        return this
      }
      const newOptions = [...options, language]
      return this.setLanguageProperty('options', newOptions)
    }

    removeLanguageOption(language: string): this {
      const options = this.language?.options ?? []
      if (!options.includes(language)) {
        return this
      }
      const newOptions = options.filter((lang: string) => lang !== language)
      return this.setLanguageProperty('options', newOptions)
    }

    setLanguageOptions(options: string[]): this {
      const existingOptions = this.language?.options ?? []
      return JSON.stringify(existingOptions) === JSON.stringify(options)
        ? this
        : this.setLanguageProperty('options', [...options])
    }
  }
}
