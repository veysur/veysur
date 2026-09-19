import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultData = {
  timestamp: false,
  ip: false,
  anonymiseIp: false,
  referrerUrl: false,
  timings: false,
  assessment: false,
}

export function DataMethods<T extends Constructor<SettingSurveyMixinBase>>(
  Base: T,
) {
  return class extends Base {
    setDataProperty(key: string, value: unknown): this {
      return this.setNestedProperty(this.data, defaultData, 'data', key, value)
    }

    updateData(updates: Record<string, unknown>): this {
      return this.updateNestedProperty(this.data, defaultData, 'data', updates)
    }
  }
}
