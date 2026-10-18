import { useMemo } from 'react'
import { resolveMapConfig } from 'veysur-common'

import { useSurveyEditorStore } from './useSurveyEditorStore'

// The provider and key participants get for this survey: its own key, else the
// project's, over the deployment default
export const useEditorMapConfig = () => {
  const survey = useSurveyEditorStore((state) => state.survey)
  const defaults = useSurveyEditorStore((state) => state.defaults)
  const effective = useSurveyEditorStore((state) => state.effective)

  return useMemo(
    () =>
      resolveMapConfig(
        effective?.mapsDeployment ?? {
          providerDefault: defaults?.maps?.provider,
        },
        survey?.maps?.googleApiKey || defaults?.maps?.googleApiKey,
      ),
    [survey?.maps?.googleApiKey, defaults, effective],
  )
}
