import { resolveContentFormat, ContentFormat } from 'veysur-common'

import { useSurveyEditorStore } from './useSurveyEditorStore'

export interface SurveyContentFormat {
  format: ContentFormat
  scriptTagsAllowed: boolean
}

// Resolves the survey's effective content format/sanitization settings
// (survey-level override, falling back to the project default) for the
// currently-open survey in the editor store - the single place editor
// components ask before choosing which `ContentEditor` `format` to render.
export const useSurveyContentFormat = (): SurveyContentFormat => {
  const survey = useSurveyEditorStore((state) => state.survey)
  const defaults = useSurveyEditorStore((state) => state.defaults)

  if (!survey) {
    return resolveDefaultsOnly(defaults.contentFormat)
  }

  const content = survey.getContentFormat(defaults)
  return {
    format: resolveContentFormat(content),
    scriptTagsAllowed: content.scriptTagsAllowed,
  }
}

const resolveDefaultsOnly = (content: {
  htmlAllowed: boolean
  markdownAllowed: boolean
  scriptTagsAllowed: boolean
}): SurveyContentFormat => ({
  format: resolveContentFormat(content),
  scriptTagsAllowed: content.scriptTagsAllowed,
})
