import { ServerAclRoleAssessor } from '@datacapy/server'

export class ServerAclRoleAssessorProjectAdmin extends ServerAclRoleAssessor {
  constructor() {
    super('projectAdmin')
  }

  async hasRole({ jwt, projectId }) {
    if (!jwt || !projectId) return false
    const project = jwt?.project
    const projectAdmin = project && Object.keys(project)
    return Array.isArray(projectAdmin) &&
      projectAdmin.length &&
      projectAdmin.includes(projectId)
      ? { projectAdmin }
      : false
  }
}

export default ServerAclRoleAssessorProjectAdmin
