import { L10n } from '../../L10n'
import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultLegalNotice = {
  show: false,
  link: false,
  text: new L10n(),
}

export function LegalNoticeMethods<
  T extends Constructor<SettingSurveyMixinBase>,
>(Base: T) {
  return class extends Base {
    setLegalNoticeProperty(key: string, value: unknown): this {
      return this.setNestedProperty(
        this.legalNotice,
        defaultLegalNotice,
        'legalNotice',
        key,
        value,
      )
    }

    updateLegalNotice(updates: Record<string, unknown>): this {
      return this.updateNestedProperty(
        this.legalNotice,
        defaultLegalNotice,
        'legalNotice',
        updates,
      )
    }

    updateLegalNoticeText(text?: string | null, lang: string = 'en'): this {
      const current = this.legalNotice || defaultLegalNotice
      return this.updateL10nProperty(current, 'legalNotice', 'text', text, lang)
    }
  }
}
