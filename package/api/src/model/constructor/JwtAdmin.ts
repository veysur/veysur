export class JwtAdmin {
  _id: string
  clientId: string
  type: string
  nameFirst: string
  nameLast: string
  email: string
  role: string
  twoFactorEnabled: boolean
  project: Record<string, { owner: boolean }>

  static alias: string

  constructor(data) {
    if (typeof data == 'object') Object.assign(this, data)
    this.type = 'admin'
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

export default JwtAdmin
