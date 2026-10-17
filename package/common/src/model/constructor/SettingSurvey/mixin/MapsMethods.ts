import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultMaps = {
  googleApiKey: '',
}

export function MapsMethods<T extends Constructor<SettingSurveyMixinBase>>(
  Base: T,
) {
  return class extends Base {
    setMapsProperty(key: string, value: unknown): this {
      return this.setNestedProperty(this.maps, defaultMaps, 'maps', key, value)
    }

    updateMaps(updates: Record<string, unknown>): this {
      return this.updateNestedProperty(this.maps, defaultMaps, 'maps', updates)
    }
  }
}
