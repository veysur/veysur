import type { ComponentType } from 'react'

/**
 * Extension points an extension uses to inject its own UI into shared
 * `appAdmin` shell components without core knowing what that UI is.
 * See `registry/getProjectSwitcher.ts` and `registry/getAdminNavbarExtra.ts`.
 */
export type ProjectSwitcher = ComponentType

/** Extra content at the end of the admin navbar. */
export type AdminNavbarExtra = ComponentType
