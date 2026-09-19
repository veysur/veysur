import React from 'react'

import {
  SurveyEditor,
  SurveyEditorBar,
  SurveySaveStatus,
  useSurveyEditorStore,
  useSurveyEditorFocus,
  SURVEY_ENTITY_TYPE_SURVEY,
  SidebarLeft,
  SidebarRight,
} from 'appAdmin/component/SurveyEditor'
import { SurveyEditorNavContainer } from 'appAdmin/component/SurveyEditor/SurveyEditorNavContainer'
import { usePageTitle } from 'hook'

export const PageSurveyEdit: React.FC = () => {
  const survey = useSurveyEditorStore((state) => state.survey)
  usePageTitle(survey?.name || 'Loading...', { suffix: 'Veysur Admin' })
  const { setSurveyFocus, getFocusedEntity } = useSurveyEditorFocus()

  const surveyFocusedEntity = React.useMemo(
    () => (survey ? getFocusedEntity(survey) : undefined),
    [survey, getFocusedEntity],
  )

  const clearFocus = React.useCallback(() => {
    setSurveyFocus({
      entityType: SURVEY_ENTITY_TYPE_SURVEY,
    })
  }, [setSurveyFocus])

  const handleEmptySpaceClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const isInsideEntity = target.closest(
      '[data-testid="question-container"], [data-testid="content-container"], [data-testid="question-group-container"], [data-testid="survey-welcome-container"], [data-testid="survey-thankyou-container"]',
    )
    if (!isInsideEntity) {
      clearFocus()
    }
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearFocus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [clearFocus])

  return (
    <div className="h-screen overflow-hidden max-w-full">
      <SurveyEditorNavContainer
        leftSidebar={<SidebarLeft />}
        rightSidebar={<SidebarRight entity={surveyFocusedEntity} />}
        headerBar={(toggleOuter, toggleLeft) => (
          <SurveyEditorBar
            toggleOuterSidebar={toggleOuter}
            toggleLeftSidebar={toggleLeft}
          />
        )}
      >
        <div
          id="survey-container"
          className="flex-1 overflow-auto overflow-x-hidden"
          onClick={handleEmptySpaceClick}
        >
          <div className="mx-auto w-full max-w-4xl box-border min-h-full">
            <SurveyEditor />
          </div>
        </div>
      </SurveyEditorNavContainer>
      <div className="fixed bottom-4 left-4 z-50">
        <SurveySaveStatus />
      </div>
    </div>
  )
}

export default PageSurveyEdit
