import { KEY_REGISTRY_ACCOUNT_ROOT_EXTRA, Registry } from 'common'
import { AccountRootExtra } from 'model'

// Defaults to `null` (nothing rendered), like getAdminRootExtra.
export const getAccountRootExtra = (): AccountRootExtra | null => {
  return Registry.getInstance().get(
    KEY_REGISTRY_ACCOUNT_ROOT_EXTRA,
    () => null,
  )
}
