import { KEY_REGISTRY_ACCOUNT_FOOTER_EXTRA_NAV, Registry } from 'common'
import { AccountFooterExtraNav } from 'model'

const NoopAccountFooterExtraNav: AccountFooterExtraNav = () => null

export const getAccountFooterExtraNav = (): AccountFooterExtraNav => {
  return Registry.getInstance().get(
    KEY_REGISTRY_ACCOUNT_FOOTER_EXTRA_NAV,
    () => NoopAccountFooterExtraNav,
  )
}
