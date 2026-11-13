import { Project } from 'model/constructor'
import { Infer, PropsOf } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import type { SchemaProjectAdmin } from './ProjectAdmin.schema'

type ProjectAdminUser = {
  _id?: string
  nameFirst?: string
  nameLast?: string
  email?: string
}

/** @schema projectAdmin construct=ProjectAdmin strict */
export interface ProjectAdminData {
  _id: string & t.Required
  projectId: string & t.Required
  userId?: (string & t.Default<null>) | null
  createdById: string & t.Required
  status?: string & t.Default<'active'>
  email?: (string & t.Default<null>) | null
  nameFirst?: (string & t.Default<null>) | null
  nameLast?: (string & t.Default<null>) | null
  code?: (string & t.Default<null>) | null
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}

type ProjectAdminOptional =
  'userId' | 'status' | 'email' | 'nameFirst' | 'nameLast' | 'code'

/**
 * Fields come from the generated {@link SchemaProjectAdmin}. Keys the schema
 * defaults are optional when constructing, so callers may omit them.
 */
export interface ProjectAdmin
  extends
    Omit<Infer<SchemaProjectAdmin>, ProjectAdminOptional>,
    Partial<Pick<Infer<SchemaProjectAdmin>, ProjectAdminOptional>> {}

export class ProjectAdmin {
  // relations
  project?: PropsOf<Project>
  user?: ProjectAdminUser
  invitedBy?: ProjectAdminUser

  constructor(data: Partial<ProjectAdmin>) {
    if (typeof data == 'object') Object.assign(this, data)
  }
}
