import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultContentFormat = {
  htmlAllowed: false,
  markdownAllowed: true,
  scriptTagsAllowed: false,
}

export function ContentFormatMethods<
  T extends Constructor<SettingSurveyMixinBase>,
>(Base: T) {
  return class extends Base {
    setContentFormatProperty(key: string, value: unknown): this {
      return this.setNestedProperty(
        this.contentFormat,
        defaultContentFormat,
        'contentFormat',
        key,
        value,
      )
    }

    updateContentFormat(updates: Record<string, unknown>): this {
      return this.updateNestedProperty(
        this.contentFormat,
        defaultContentFormat,
        'contentFormat',
        updates,
      )
    }
  }
}
