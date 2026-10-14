import { KEY_REGISTRY_ADMIN_ROOT_EXTRA, Registry } from 'common'
import { AdminRootExtra } from 'model'

// Defaults to `null` (nothing rendered), like getAdminNavbarExtra.
export const getAdminRootExtra = (): AdminRootExtra | null => {
  return Registry.getInstance().get(KEY_REGISTRY_ADMIN_ROOT_EXTRA, () => null)
}
