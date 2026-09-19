import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { Project } from 'veysur-common'

import {
  KEY_STATE_PROJECT_DOMAIN,
  getUserProjects,
  resolveActiveProject,
} from 'common'

import { useAuth } from 'hook/useAuth'

type ProjectDomainData = Project | null

export function useProjectDomain() {
  const { isAuthed, auth } = useAuth()

  const queryClient = useQueryClient()

  const { data: project } = useAuthdQuery<ProjectDomainData>(
    {
      queryKey: [KEY_STATE_PROJECT_DOMAIN],
      queryFn: async () => null,
      staleTime: Infinity,
    },
    queryClient,
  )

  const setProject = useCallback(
    (data: ProjectDomainData) => {
      queryClient.setQueryData([KEY_STATE_PROJECT_DOMAIN], () => data)
    },
    [queryClient],
  )

  useEffect(() => {
    if (!isAuthed || !auth?.user) return

    // The scoping source is pluggable (subdomain for cloud, single for
    // self-hosted) — see resolveActiveProject / PUBLIC_PROJECT_SCOPE.
    const locatedProject =
      resolveActiveProject(
        getUserProjects(auth.user.projectOwn, auth.user.projectAdmin),
        { host: window.location.host },
      ) || null

    // Compare by value rather than skipping whenever `project` is already
    // set - a cached project can outlive the auth data it came from (e.g. a
    // dev environment reseed produces new ids, or a project field like
    // timezone is edited and authRefresh(true) pulls in the change), so
    // re-resolve whenever the two disagree instead of trusting a stale
    // cache indefinitely.
    if (JSON.stringify(project) !== JSON.stringify(locatedProject)) {
      setProject(locatedProject)
    }
  }, [isAuthed, auth?.user, project, setProject])

  return project
}
