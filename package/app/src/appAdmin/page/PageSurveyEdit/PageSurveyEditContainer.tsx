import React, { useEffect } from 'react'
import { useParams, Outlet } from 'react-router-dom'

import { useSettingSurvey } from 'appAdmin/component/SettingSurvey'
import {
  useSurveyEditor,
  useSurveyEditorOperations,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import { useEmailTemplateEditorStore } from 'appAdmin/component/SurveySettingShared'
import { useUnifiedNavigationBlocker } from 'hook/useUnifiedNavigationBlocker'
import { usePageTitle } from 'hook'

import { PageSurveyEditSkeleton } from './PageSurveyEditSkeleton'

export const PageSurveyEditContainer: React.FC = () => {
  const setDefaults = useSurveyEditorStore((state) => state.setDefaults)
  const patchBuffer = useSurveyEditorStore((state) => state.patchBuffer)
  const childNavigationBlocker = useSurveyEditorStore(
    (state) => state.childNavigationBlocker,
  )
  const emailTemplatePatchBuffer = useEmailTemplateEditorStore(
    (state) => state.patchBuffer,
  )
  const { settingSurvey, isDirty: isSettingsDirty } = useSettingSurvey()
  const { surveyId } = useParams<{ surveyId: string }>()
  const useSurveyEditorState = useSurveyEditor({ surveyId })
  const { loadSurvey, survey, isLoading } = useSurveyEditorState

  usePageTitle(survey?.name || 'Loading...', { suffix: 'Veysur Admin' })

  const useSurveyEditorOperationsState = useSurveyEditorOperations({
    surveyId,
    useSurveyEditorState,
  })

  const navigationBlockerDialog = useUnifiedNavigationBlocker(
    [
      {
        condition: isSettingsDirty,
        message: 'You have unsaved changes to survey settings.',
      },
      {
        condition: (patchBuffer?.hasPending() || false) && !isLoading,
        message: 'Your survey changes are still being saved.',
      },
      {
        condition:
          (emailTemplatePatchBuffer?.hasPending() || false) && !isLoading,
        message: 'Your email template changes are still being saved.',
      },
      {
        condition: childNavigationBlocker?.condition ?? false,
        message: childNavigationBlocker?.message ?? '',
      },
    ],
    {
      title: 'Unsaved Changes',
      description:
        'You have unsaved survey changes. Are you sure you want to leave without saving?',
      confirmLabel: 'Leave Without Saving',
      cancelLabel: 'Continue Editing',
      onSaveAndContinue: childNavigationBlocker?.onSaveAndContinue,
    },
    /^\/survey\/[^/]+/,
  )

  useEffect(() => {
    if (!survey?._id || survey._id !== surveyId) loadSurvey(surveyId)
  }, [surveyId, survey?._id, loadSurvey])

  useEffect(() => {
    if (settingSurvey) setDefaults(settingSurvey)
  }, [settingSurvey, setDefaults])

  if (!survey) {
    return <PageSurveyEditSkeleton />
  }

  return (
    <>
      <Outlet
        context={{
          settingSurvey,
          useSurveyEditorState,
          useSurveyEditorOperationsState,
        }}
      />
      {navigationBlockerDialog}
    </>
  )
}

export default PageSurveyEditContainer
