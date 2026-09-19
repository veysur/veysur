import React from 'react'

import { AppFooter } from 'component/AppFooter'
import { getAccountFooterExtraNav } from 'registry'

// Resolved once at module scope, not inside the component — the registry
// value is stable for the process lifetime (set once, before this module is
// ever imported; see appAccount/Router.tsx), and computing it during render
// makes `react-hooks/static-components` (correctly) suspect a fresh
// component identity every render.
const AccountFooterExtraNav = getAccountFooterExtraNav()

export const AccountFooter: React.FC = () => {
  return <AppFooter hideContactLink extraNavItems={<AccountFooterExtraNav />} />
}
