import { Project } from 'model/constructor'
import { Infer, PropsOf } from '@datacapy/schema'

import { projectAdminSpec } from '../schema/SchemaProjectAdmin'

type ProjectAdminUser = {
  _id?: string
  nameFirst?: string
  nameLast?: string
  email?: string
}

/** Fields come from {@link projectAdminSpec}. */
export interface ProjectAdmin extends Infer<typeof projectAdminSpec> {}

export class ProjectAdmin {
  // relations
  project?: PropsOf<Project>
  user?: ProjectAdminUser
  invitedBy?: ProjectAdminUser

  constructor(data: Partial<ProjectAdmin>) {
    if (typeof data == 'object') Object.assign(this, data)
  }
}
