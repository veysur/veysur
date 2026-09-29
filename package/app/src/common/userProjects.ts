import { Project, ProjectAdmin } from 'veysur-common'
import { PropsOf } from '@datacapy/schema'

export function getOwnedProjects(
  projectOwn?: Array<PropsOf<Project>>,
): Array<PropsOf<Project>> {
  return projectOwn ?? []
}

export function getAdminProjects(
  projectAdmin?: Array<PropsOf<ProjectAdmin>>,
): Array<PropsOf<Project>> {
  return (projectAdmin ?? [])
    .map((projectAdmin) => projectAdmin.project)
    .filter((project): project is PropsOf<Project> => !!project)
}

export function getUserProjects(
  projectOwn?: Array<PropsOf<Project>>,
  projectAdmin?: Array<PropsOf<ProjectAdmin>>,
): Array<PropsOf<Project>> {
  return [...getOwnedProjects(projectOwn), ...getAdminProjects(projectAdmin)]
}
