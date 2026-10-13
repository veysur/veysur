import { KEY_REGISTRY_LOGIN_DEFAULTS, Registry } from 'common'
import { LoginDefaultsResolver } from 'model'

const NoopLoginDefaults: LoginDefaultsResolver = () => null

export const getLoginDefaults = (): LoginDefaultsResolver => {
  return Registry.getInstance().get(
    KEY_REGISTRY_LOGIN_DEFAULTS,
    () => NoopLoginDefaults,
  )
}
