import { genUniqueId } from '@datacapy/id'

import { UserClient, Project, ProjectAdmin } from 'model/constructor'
import { Infer, PropsOf } from '@datacapy/schema'

import { userShape } from '../schema/SchemaUser'

export class User {
  updatedAt: Date

  // relations
  projectOwn?: PropsOf<Project>[]
  projectAdmin?: PropsOf<ProjectAdmin>[]
  client?: PropsOf<UserClient>[]

  static alias: string

  constructor(data) {
    if (typeof data == 'object') Object.assign(this, data)
    this._id = data?._id || genUniqueId()
  }

  getFullName() {
    return this.nameFirst + ' ' + this.nameLast
  }

  getShortName() {
    return this.nameFirst + ' ' + (this.nameLast ? this.nameLast[0] : '')
  }

  getInitials() {
    return this.nameFirst && this.nameLast
      ? this.nameFirst[0].toUpperCase() + this.nameLast[0].toUpperCase()
      : this.nameFirst
        ? this.nameFirst[0].toUpperCase()
        : this.nameLast
          ? this.nameLast[0].toUpperCase()
          : ''
  }

  hasRole(role) {
    const roles = Array.isArray(role) ? role : [role]
    return roles.indexOf(this.role) !== -1
  }
}

export interface User extends Omit<Infer<typeof userShape>, 'client'> {}

export default User
