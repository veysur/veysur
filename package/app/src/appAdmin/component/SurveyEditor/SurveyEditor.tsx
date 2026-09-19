import React from 'react'

import { useSurveyEditorStore } from './hook/useSurveyEditorStore'
import { SurveyEditorContent } from './SurveyEditorContent'
import { SurveyEditorPlaceholder } from './SurveyEditorPlaceholder'

export const SurveyEditor: React.FC = () => {
  const isLoading = useSurveyEditorStore((state) => state.isLoading)
  const survey = useSurveyEditorStore((state) => state.survey)

  return isLoading || survey == null ? (
    <SurveyEditorPlaceholder />
  ) : (
    <SurveyEditorContent />
  )
}
