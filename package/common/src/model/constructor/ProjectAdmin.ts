import { Project } from 'model/constructor'
import { PropsOf } from 'mzen-schema'

type ProjectAdminUser = {
  _id?: string
  nameFirst?: string
  nameLast?: string
  email?: string
}

export class ProjectAdmin {
  _id: string
  projectId: string
  userId?: string
  createdById: string
  status?: string
  email?: string
  nameFirst?: string
  nameLast?: string
  code?: string
  createdAt: Date
  updatedAt: Date

  // relations
  project?: PropsOf<Project>
  user?: ProjectAdminUser
  invitedBy?: ProjectAdminUser

  constructor(data) {
    if (typeof data == 'object') Object.assign(this, data)
  }
}
