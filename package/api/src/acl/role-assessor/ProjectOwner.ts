import { ServerAclRoleAssessor } from 'mzen-server'

export class ServerAclRoleAssessorProjectOwner extends ServerAclRoleAssessor {
  constructor() {
    super('projectOwner')
  }

  async hasRole({ jwt, projectId }) {
    if (!jwt || !projectId) return false
    const project = jwt?.project
    const projectOwner =
      project &&
      Object.keys(project).filter((projectId) => !!project[projectId].owner)
    return Array.isArray(projectOwner) &&
      projectOwner.length &&
      projectOwner.includes(projectId)
      ? { projectOwner }
      : false
  }
}

export default ServerAclRoleAssessorProjectOwner
