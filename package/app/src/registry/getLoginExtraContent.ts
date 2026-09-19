import { KEY_REGISTRY_LOGIN_EXTRA_CONTENT, Registry } from 'common'
import { LoginExtraContent } from 'model'

const NoopLoginExtraContent: LoginExtraContent = () => null

export const getLoginExtraContent = (): LoginExtraContent => {
  return Registry.getInstance().get(
    KEY_REGISTRY_LOGIN_EXTRA_CONTENT,
    () => NoopLoginExtraContent,
  )
}
