import type { useAuth } from 'hook'

export function isProjectOwned(
  auth: ReturnType<typeof useAuth>['auth'],
  projectId: string,
): boolean {
  return !!auth?.user.projectOwn.some((p) => p._id === projectId)
}
