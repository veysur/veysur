import type { ComponentType } from 'react'

/**
 * Extension points an extension uses to inject its own UI into shared
 * `appAdmin` shell components without core knowing what that UI is.
 * See `registry/getProjectSwitcher.ts` and `registry/getAdminNavbarExtra.ts`.
 */
export type ProjectSwitcher = ComponentType

/** Renders nothing visible; mounted once at the admin app root, beside the toaster. */
export type AdminRootExtra = ComponentType

/** Renders nothing visible by itself; mounted once at the account app root, beside the toaster. */
export type AccountRootExtra = ComponentType

/** Extra content at the end of the admin navbar. */
export type AdminNavbarExtra = ComponentType
