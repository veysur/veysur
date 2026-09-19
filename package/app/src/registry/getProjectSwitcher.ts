import { KEY_REGISTRY_PROJECT_SWITCHER, Registry } from 'common'
import { ProjectSwitcher } from 'model'

// Unlike other registry slots (e.g. getAccountFooterExtraNav), this defaults
// to `null` rather than a no-op component: NavbarBrand's `title` prop uses
// `{title && ...}` truthiness to decide whether to render its `|` separator,
// so a truthy-but-renders-null element would still leave a stray separator
// in self-hosted. Callers must only build the `title` prop when this
// returns a real component.
export const getProjectSwitcher = (): ProjectSwitcher | null => {
  return Registry.getInstance().get(KEY_REGISTRY_PROJECT_SWITCHER, () => null)
}
