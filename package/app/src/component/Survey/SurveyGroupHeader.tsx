import React, { useMemo } from 'react'
import {
  SurveySection,
  ExpressionContext,
  resolveTextExpressions,
  expressionEscapeForContentFormat,
} from 'veysur-common'

import { Separator } from 'component/shadcn/separator'
import { Card, CardContent } from 'component/shadcn/card'

import { SurveyContent } from './SurveyContent'
import type {
  SurveyPresentationConfig,
  SurveyContentFormatConfig,
} from './SurveyTypes'

type Props = {
  group: SurveySection
  presentation: SurveyPresentationConfig
  contentFormat: SurveyContentFormatConfig
  lang: string
  langDefault: string
  /**
   * Builds the `{{...}}` expression context for this group, scoped by
   * `Survey.tsx` to only questions before the group's own first question
   * (a group's text cannot reference answers to its own not-yet-collected
   * questions), mirroring the condition engine's forward-reference rule.
   */
  getExpressionContext: (groupId: string) => ExpressionContext
}

export const SurveyGroupHeader: React.FC<Props> = ({
  group,
  presentation,
  contentFormat,
  lang,
  langDefault,
  getExpressionContext,
}) => {
  const expressionContext: ExpressionContext = useMemo(
    () => getExpressionContext(group._id),
    [getExpressionContext, group._id],
  )

  if (!presentation.groupName && !presentation.groupDesc) return null

  // group.name renders as plain React text (not dangerouslySetInnerHTML), so
  // its expression result must not be HTML-escaped, unlike group.desc below.
  const groupName = resolveTextExpressions(
    group.name.getLang(lang, langDefault),
    expressionContext,
    { escape: 'none' },
  )
  const groupDesc = group.desc
    ? resolveTextExpressions(
        group.desc.getLang(lang, langDefault),
        expressionContext,
        { escape: expressionEscapeForContentFormat(contentFormat.format) },
      )
    : null

  return (
    <div className="survey-group-header mb-6">
      {presentation.groupName && (
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
          {groupName}
        </h2>
      )}
      {presentation.groupDesc && groupDesc && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-3">
            <SurveyContent
              raw={groupDesc}
              format={contentFormat.format}
              scriptTagsAllowed={contentFormat.scriptTagsAllowed}
              className="text-sm text-muted-foreground"
            />
          </CardContent>
        </Card>
      )}
      <Separator className="mt-4" />
    </div>
  )
}
