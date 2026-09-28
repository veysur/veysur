import { L10n } from '../../L10n'
import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultDataPolicy = {
  show: false,
  link: false,
  text: new L10n(),
  url: new L10n(),
}

export function DataPolicyMethods<
  T extends Constructor<SettingSurveyMixinBase>,
>(Base: T) {
  return class extends Base {
    setDataPolicyProperty(key: string, value: unknown): this {
      return this.setNestedProperty(
        this.dataPolicy,
        defaultDataPolicy,
        'dataPolicy',
        key,
        value,
      )
    }

    updateDataPolicy(updates: Record<string, unknown>): this {
      return this.updateNestedProperty(
        this.dataPolicy,
        defaultDataPolicy,
        'dataPolicy',
        updates,
      )
    }

    updateDataPolicyText(text?: string | null, lang: string = 'en'): this {
      const current = this.dataPolicy || defaultDataPolicy
      return this.updateL10nProperty(current, 'dataPolicy', 'text', text, lang)
    }

    updateDataPolicyUrl(url?: string | null, lang: string = 'en'): this {
      const current = this.dataPolicy || defaultDataPolicy
      return this.updateL10nProperty(current, 'dataPolicy', 'url', url, lang)
    }
  }
}
