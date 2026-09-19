import { useOutletContext } from 'react-router-dom'
import { Menu, Settings, Layers } from 'lucide-react'
import { SettingSurvey } from 'veysur-common'

import { cn } from 'common/cn'
import { useSidebar } from 'component/shadcn/sidebar'
import { Button } from 'component/shadcn/button'
import { ContentEditable } from 'appAdmin/component/ContentEditable'
import {
  useSurveyEditor,
  useSurveyEditorOperations,
  SURVEY_ENTITY_TYPE_SURVEY,
  SURVEY_ENTITY_TYPE_NAME,
} from 'appAdmin/component/SurveyEditor'
import { SurveyEditorPublish } from 'appAdmin/component/SurveyEditorPublish'

type OutletContext = {
  settingSurvey: SettingSurvey
  useSurveyEditorState: ReturnType<typeof useSurveyEditor>
  useSurveyEditorOperationsState: ReturnType<typeof useSurveyEditorOperations>
}

export interface SurveyEditorBarProps {
  toggleOuterSidebar?: () => void
  toggleLeftSidebar?: () => void
}

export function SurveyEditorBar({
  toggleOuterSidebar,
  toggleLeftSidebar,
}: SurveyEditorBarProps) {
  const { useSurveyEditorState, useSurveyEditorOperationsState } =
    useOutletContext<OutletContext>()
  const { survey } = useSurveyEditorState

  const { operations, surveyFocus, setSurveyFocus } =
    useSurveyEditorOperationsState

  // Get toggle for right sidebar (innermost provider)
  const { toggleSidebar: toggleRightSidebar } = useSidebar()

  // const handleEmptySpaceClick = (e: React.MouseEvent) => {
  //   if (e.target === e.currentTarget) {
  //     setSurveyFocus({
  //       entityType: SURVEY_ENTITY_TYPE_SURVEY,
  //     })
  //   }
  // }

  const handleFocusName = () => {
    setSurveyFocus({
      entityType: SURVEY_ENTITY_TYPE_NAME,
    })
  }

  const nameInput = survey ? (
    <div
      className={cn('survey-name-input', 'p-1 w-full', {
        'survey-name-focused':
          surveyFocus?.entityType == SURVEY_ENTITY_TYPE_SURVEY &&
          surveyFocus?.id == 'name',
      })}
    >
      <ContentEditable
        value={survey.name ?? ''}
        placeholder="Enter survey name..."
        onChange={(value: string) => operations?.updateSurveyName(value)}
        onClick={handleFocusName}
        onFocus={handleFocusName}
      />
    </div>
  ) : (
    <div className="survey-name-placeholder">
      <span className="text-muted-foreground">Loading survey...</span>
    </div>
  )

  return (
    <>
      <div className="z-40 bg-sidebar border-b py-2">
        <div className="px-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex flex-1 min-w-0 items-center space-x-2">
              {toggleOuterSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 lg:hidden"
                  onClick={toggleOuterSidebar}
                >
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Navigation</span>
                </Button>
              )}
              {toggleLeftSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 lg:hidden"
                  onClick={toggleLeftSidebar}
                >
                  <Layers className="h-4 w-4" />
                  <span className="sr-only">Structure</span>
                </Button>
              )}
              <div className="flex flex-1 min-w-0 items-center text-xl font-semibold hover:bg-accent">
                {nameInput}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 ms-2 lg:hidden"
                onClick={toggleRightSidebar}
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Attributes</span>
              </Button>
              <SurveyEditorPublish />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
