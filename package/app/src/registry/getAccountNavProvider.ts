import { ClipboardList } from 'lucide-react'

import { KEY_REGISTRY_ACCOUNT_NAV_PROVIDER, Registry } from 'common'
import { AccountNavProvider, AuthDomain } from 'model'

// "Profile" is deliberately not here - in self-hosted it lives in the account
// dropdown menu instead, matching admin's "Manage Account" placement (see
// NavbarBrandAccount.tsx). "Team" and "Settings" also live in
// NavbarBrandAccount.tsx directly rather than here, since they need
// owner-gating and (Settings) a dropdown - neither of which this flat
// AccountNavItem list shape supports.
const selfHostedAccountNavProvider: AccountNavProvider = {
  getNavItems: () => [
    {
      label: 'Surveys',
      icon: ClipboardList,
      path: AuthDomain.getAdminUrl(window.location.host),
      tooltip: 'Surveys',
      external: true,
    },
  ],
}

export const getAccountNavProvider = (): AccountNavProvider => {
  return Registry.getInstance().get(
    KEY_REGISTRY_ACCOUNT_NAV_PROVIDER,
    () => selfHostedAccountNavProvider,
  )
}
