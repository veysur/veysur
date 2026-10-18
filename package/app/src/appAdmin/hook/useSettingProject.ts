import { useAuthdQuery } from 'hook/useAuthdQuery'

import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SETTING_PROJECT } from 'appAdmin/common'
import { getSettingProjectApi } from 'appAdmin/registry/getSettingProjectApi'

export function useSettingProject() {
  const project = useProjectDomain()

  const { data, isLoading, error } = useAuthdQuery({
    enabled: !!project?._id,
    queryKey: [KEY_STATE_SETTING_PROJECT, project?._id],
    queryFn: () => getSettingProjectApi().get(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })

  return {
    settingProject: data,
    isLoading,
    error: error?.message ?? null,
  }
}
