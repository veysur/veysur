import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { SettingSurvey } from 'veysur-common'

import { useAuth, useProjectDomain } from 'appAdmin/hook'

import { getSettingSurveyApi } from '../registry'
import { KEY_STATE_SETTING_SURVEY } from '../common/keyState'

export function useSettingSurvey() {
  const queryClient = useQueryClient()
  const { auth } = useAuth()
  const project = useProjectDomain()
  const [localSettingSurvey, setLocalSettingSurvey] = useState<
    SettingSurvey | undefined
  >()
  const [isDirty, setIsDirty] = useState(false)

  const {
    data: serverSettingSurvey,
    isError,
    isLoading,
    isFetching,
    error,
  } = useAuthdQuery<SettingSurvey | undefined>(
    {
      enabled: !!project?._id,
      queryKey: [KEY_STATE_SETTING_SURVEY, project?._id],
      queryFn: async () => {
        if (!auth?.accessToken?.token) {
          return Promise.reject('Authentication required')
        }
        if (!project?._id) {
          return Promise.reject('Invalid project ID')
        }

        const setting = await getSettingSurveyApi().getOne()
        const settingSurvey = new SettingSurvey(setting)

        // Initialize local state with server data
        setLocalSettingSurvey(settingSurvey)
        setIsDirty(false)

        return settingSurvey
      },
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
    },
    queryClient,
  )

  const updateLocalSettingSurvey = useCallback(
    (updater: (s: SettingSurvey) => SettingSurvey) => {
      const current = localSettingSurvey || serverSettingSurvey
      if (current) {
        const updated = updater(current)
        setLocalSettingSurvey(updated)
        setIsDirty(true)
      }
    },
    [localSettingSurvey, serverSettingSurvey],
  )

  const resetToServer = useCallback(() => {
    if (serverSettingSurvey) {
      setLocalSettingSurvey(serverSettingSurvey)
      setIsDirty(false)
    }
  }, [serverSettingSurvey])

  const markClean = useCallback(() => {
    setIsDirty(false)
  }, [])

  return {
    settingSurvey: localSettingSurvey || serverSettingSurvey,
    serverSettingSurvey,
    isLoading,
    isFetching,
    isError,
    error,
    isDirty,
    updateLocalSettingSurvey,
    resetToServer,
    markClean,
  }
}
