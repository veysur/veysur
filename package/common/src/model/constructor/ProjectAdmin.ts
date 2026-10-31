import { Project } from 'model/constructor'
import { Infer, PropsOf } from '@datacapy/schema'

import { projectAdminShape } from '../schema/SchemaProjectAdmin'

type ProjectAdminUser = {
  _id?: string
  nameFirst?: string
  nameLast?: string
  email?: string
}

export class ProjectAdmin {
  // relations
  project?: PropsOf<Project>
  user?: ProjectAdminUser
  invitedBy?: ProjectAdminUser

  constructor(data: Partial<ProjectAdmin>) {
    if (typeof data == 'object') Object.assign(this, data)
  }
}

export interface ProjectAdmin extends Infer<typeof projectAdminShape> {}
