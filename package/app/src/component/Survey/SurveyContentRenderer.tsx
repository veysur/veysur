import React, { Suspense, useMemo } from 'react'
import {
  SurveyContent as SurveyContentModel,
  ExpressionContext,
  resolveTextExpressions,
  expressionEscapeForContentFormat,
} from 'veysur-common'

import { getContentTypeByName } from 'component/SurveyContentType/getContentType'

import { SurveyContentFormatConfig } from './SurveyTypes'

type Props = {
  element: SurveyContentModel
  contentFormat: SurveyContentFormatConfig
  lang: string
  langDefault: string
  /**
   * Builds the `{{...}}` expression context for a content element, scoped to
   * only the questions before it in survey order — mirrors
   * `SurveyQuestionRenderer`. Owned by `Survey.tsx`.
   */
  getExpressionContext: (elementId: string) => ExpressionContext
}

export const SurveyContentRenderer: React.FC<Props> = ({
  element,
  contentFormat,
  lang,
  langDefault,
  getExpressionContext,
}) => {
  const expressionContext = useMemo(
    () => getExpressionContext(element._id),
    [getExpressionContext, element._id],
  )

  const rawText = element.text?.getLang(lang, langDefault) ?? ''
  const resolvedText = resolveTextExpressions(rawText, expressionContext, {
    escape: expressionEscapeForContentFormat(contentFormat.format),
  })

  const ContentType = getContentTypeByName(element.type)
  if (!ContentType) return null

  return (
    <Suspense fallback={null}>
      {/* eslint-disable-next-line react-hooks/static-components -- stable registry-provided reference, not created during render */}
      <ContentType
        element={element}
        resolvedText={resolvedText}
        rawText={rawText}
        contentFormat={contentFormat}
      />
    </Suspense>
  )
}
