import { KEY_REGISTRY_ADMIN_NAVBAR_EXTRA, Registry } from 'common'
import { AdminNavbarExtra } from 'model'

// Defaults to `null` (nothing rendered), like getProjectSwitcher.
export const getAdminNavbarExtra = (): AdminNavbarExtra | null => {
  return Registry.getInstance().get(KEY_REGISTRY_ADMIN_NAVBAR_EXTRA, () => null)
}
