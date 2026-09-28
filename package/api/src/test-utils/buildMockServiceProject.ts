import { Project, User } from 'veysur-common'

import { attachProjectOwn } from 'model/common'

/**
 * Stand-in for the `project` service as seen by auth and user services: it
 * runs the real self-hosted `attachOwnership` behaviour against a fixed
 * project, so tests still assert on the attached `projectOwn` /
 * `projectAdmin[].project` without a `RepoProject`.
 */
export function buildMockServiceProject(
  overrides: Partial<Pick<Project, '_id' | 'name' | 'ownerId'>> = {},
) {
  const project = new Project({
    _id: 'default',
    name: 'Project',
    ownerId: 'nobody',
    ...overrides,
  })
  return {
    attachOwnership: jest.fn(async (user: User) =>
      attachProjectOwn(user, project),
    ),
  }
}
