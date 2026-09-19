import React from 'react'

import {
  SurveyEditorNavContainer,
  SurveySaveStatus,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import { SurveySetting } from 'appAdmin/component/SurveySetting'
import { SettingsSidebar } from 'appAdmin/component/SurveySettingShared'
import { useSettingsPageLogic } from 'appAdmin/hook/useSettingsPageLogic'
import { usePageTitle } from 'hook'

export const PageSurveyEditSetting: React.FC = () => {
  const survey = useSurveyEditorStore((state) => state.survey)
  usePageTitle(`Settings - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })
  const { section, handleSectionChange } = useSettingsPageLogic()

  return (
    <div className="h-screen overflow-hidden max-w-full">
      <SurveyEditorNavContainer
        surveyName={survey?.name}
        leftSidebar={
          <SettingsSidebar
            activeSection={section}
            onSectionChange={handleSectionChange}
          />
        }
      >
        <SurveySetting
          activeSection={section}
          onSectionChange={handleSectionChange}
        />
      </SurveyEditorNavContainer>
      <div className="fixed bottom-4 left-4 z-50">
        <SurveySaveStatus />
      </div>
    </div>
  )
}

export default PageSurveyEditSetting
