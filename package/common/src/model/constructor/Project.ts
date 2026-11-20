import type { tags as t } from '@datacapy/schema'

// Self-hosted is single-project by design — there is exactly one row, fixed
// to DEFAULT_PROJECT_ID, persisted via `RepoProject` and cached in memory by
// `ServiceProject` (see `package/api`). This is the shared base shape: the
// extension package veysur-common-cloud's own `Project` type extends this
// with its own multi-project fields rather than redefining the fields below.
export const DEFAULT_PROJECT_ID = 'default'

/** @schema project strict */
export class Project {
  _id: string & t.Required
  name: string & t.Required
  timezone: string & t.Default<'UTC'>
  ownerId: string & t.Default<''>
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>

  constructor(data?: Partial<Project>) {
    this._id = DEFAULT_PROJECT_ID
    if (typeof data == 'object') Object.assign(this, data)
  }
}
