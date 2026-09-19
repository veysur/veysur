// Self-hosted is single-project by design — there is exactly one row, fixed
// to DEFAULT_PROJECT_ID, persisted via `RepoProject` and cached in memory by
// `ServiceProject` (see `package/api`). This is the shared base shape: the
// commercial veysur-common-cloud package's own `Project` type extends this
// with its own multi-tenant fields rather than redefining the fields below.
export const DEFAULT_PROJECT_ID = 'default'

export class Project {
  _id: string = DEFAULT_PROJECT_ID
  name: string
  timezone: string
  ownerId: string
  createdAt: Date
  updatedAt: Date

  constructor(data) {
    if (typeof data == 'object') Object.assign(this, data)
  }
}
