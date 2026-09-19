import { Project, User } from 'veysur-common'

/**
 * Self-hosted has no `RepoProject` for `RepoUser.projectOwn`/
 * `RepoProjectAdmin.project` to join against — the single project is a
 * static config value (see `ServiceProject.getById`). This attaches it
 * manually onto a populated user, so `ServiceAuthDirect`'s JWT `project`
 * claim and every other `user.projectOwn`/`projectAdmin[].project` reader
 * keep working unmodified.
 */
export function attachProjectOwn(user: User, project: Project): User {
  user.projectOwn = user._id === project.ownerId ? [project] : []
  user.projectAdmin = (user.projectAdmin ?? []).map((projectAdmin) => ({
    ...projectAdmin,
    project,
  }))
  return user
}
