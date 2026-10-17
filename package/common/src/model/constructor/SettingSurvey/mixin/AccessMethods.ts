import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultAccess = {
  anonymous: false,
  open: false,
  publicReg: false,
  index: false,
  tokenPersist: true,
  multiple: false,
  preventRepeat: false,
  resumeLink: false,
  botProtection: false,
  embed: false,
  embedDomains: [],
}

export function AccessMethods<T extends Constructor<SettingSurveyMixinBase>>(
  Base: T,
) {
  return class extends Base {
    setAccessProperty(key: string, value: unknown): this {
      return this.setNestedProperty(
        this.access,
        defaultAccess,
        'access',
        key,
        value,
      )
    }

    updateAccess(updates: Record<string, unknown>): this {
      return this.updateNestedProperty(
        this.access,
        defaultAccess,
        'access',
        updates,
      )
    }
  }
}
