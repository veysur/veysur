import { Infer } from '@datacapy/schema'

import { projectBaseShape } from '../schema/SchemaProject'

// Self-hosted is single-project by design — there is exactly one row, fixed
// to DEFAULT_PROJECT_ID, persisted via `RepoProject` and cached in memory by
// `ServiceProject` (see `package/api`). This is the shared base shape: the
// extension package veysur-common-cloud's own `Project` type extends this
// with its own multi-project fields rather than redefining the fields below.
export const DEFAULT_PROJECT_ID = 'default'

export class Project {
  constructor(data?: Partial<Infer<typeof projectBaseShape>>) {
    this._id = DEFAULT_PROJECT_ID
    if (typeof data == 'object') Object.assign(this, data)
  }
}

// The fields come from `projectBaseShape` (schema/SchemaProject.ts); merging
// the inferred type here keeps one definition.
export interface Project extends Infer<typeof projectBaseShape> {}
