import React from 'react'
import { ArrowRight, Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Survey as SurveyEntity,
  ExpressionContext,
  L10n,
  resolveTextExpressions,
  expressionEscapeForContentFormat,
} from 'veysur-common'

import { Button } from 'component/shadcn/button'

import { SurveySuccessCard } from './SurveySuccessCard'
import { SurveyContent } from './SurveyContent'
import type { SurveyContentFormatConfig } from './SurveyTypes'

type Props = {
  survey?: SurveyEntity
  contentFormat: SurveyContentFormatConfig
  lang: string
  langDefault: string
  showLink?: boolean
  showPrint?: boolean
  onPrint?: () => void
  /** answers/participant/response scope for `{{...}}` expressions in the
   * thank-you message - the full survey response, since the thank-you page
   * renders after every question has been answered. */
  expressionContext?: ExpressionContext
}

export const SurveyThankYou: React.FC<Props> = ({
  survey,
  contentFormat,
  lang,
  langDefault,
  showLink = true,
  showPrint,
  onPrint,
  expressionContext,
}) => {
  const { t } = useTranslation('app-survey')
  const rawThankYouMessage = survey?.thankYouSection?.desc?.getLang(
    lang,
    langDefault,
  )
  const thankYouMessage =
    rawThankYouMessage && expressionContext
      ? resolveTextExpressions(rawThankYouMessage, expressionContext, {
          escape: expressionEscapeForContentFormat(contentFormat.format),
        })
      : rawThankYouMessage
  const link = survey?.thankYouSection?.config?.link
  const thankYouLinkUrl = link?.url
    ? new L10n(link.url).getLang(lang, langDefault)
    : undefined
  const thankYouLinkText = link?.text
    ? new L10n(link.text).getLang(lang, langDefault)
    : undefined

  return (
    <div className="survey-thank-you">
      <SurveySuccessCard>
        {thankYouMessage ? (
          <SurveyContent
            raw={thankYouMessage}
            format={contentFormat.format}
            scriptTagsAllowed={contentFormat.scriptTagsAllowed}
            className="survey-thank-you-message html-content text-center"
          />
        ) : (
          <h2 className="survey-thank-you-message html-content text-center">
            {t('thankYou.defaultMessage')}
          </h2>
        )}

        {showLink && thankYouLinkUrl && (
          <div className="text-center mt-6">
            <Button size="lg" asChild>
              <a
                href={thankYouLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {thankYouLinkText || thankYouLinkUrl}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
      </SurveySuccessCard>

      {showPrint && onPrint && (
        <div className="text-center mt-6">
          <Button size="lg" variant="outline" onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t('print.button')}
          </Button>
        </div>
      )}
    </div>
  )
}
