import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultNotify = {
  basic: '',
  detailed: '',
}

export function NotifyMethods<T extends Constructor<SettingSurveyMixinBase>>(
  Base: T,
) {
  return class extends Base {
    setNotifyProperty(key: string, value: unknown): this {
      return this.setNestedProperty(
        this.notify,
        defaultNotify,
        'notify',
        key,
        value,
      )
    }

    updateNotify(updates: Record<string, unknown>): this {
      return this.updateNestedProperty(
        this.notify,
        defaultNotify,
        'notify',
        updates,
      )
    }
  }
}
