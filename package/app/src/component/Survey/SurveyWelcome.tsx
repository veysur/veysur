import React, { useState } from 'react'
import { Shield, Info, ArrowRight, Check, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  ExpressionContext,
  resolveTextExpressions,
  expressionEscapeForContentFormat,
} from 'veysur-common'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'component/shadcn/dialog'
import { Button } from 'component/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from 'component/shadcn/card'
import { Badge } from 'component/shadcn/badge'
import { Checkbox } from 'component/shadcn/checkbox'
import { Label } from 'component/shadcn/label'
import { SurveyContent } from './SurveyContent'
import type {
  SurveyPresentationConfig,
  SurveyContentFormatConfig,
} from './SurveyTypes'

type PolicyTextLike = {
  show?: boolean | null
  link?: boolean | null
  text?: { getLang?: (lang: string, langDefault?: string) => string } | null
  url?: { getLang?: (lang: string, langDefault?: string) => string } | null
}

type SurveyWelcomeData = {
  dataPolicy?: PolicyTextLike | null
  legalNotice?: PolicyTextLike | null
  welcomeSection?: {
    desc?: { getLang?: (lang: string, langDefault: string) => string } | null
  }
}

type Props = {
  survey?: SurveyWelcomeData
  presentation: SurveyPresentationConfig
  contentFormat: SurveyContentFormatConfig
  lang: string
  langDefault: string
  /** `{{...}}` scope for the welcome message - participant.* / response.* /
   * labels.* only (no answers; see `Survey.tsx`'s welcomeExpressionContext). */
  expressionContext?: ExpressionContext
  onContinue: () => void
  countdown: number
}

export const SurveyWelcome: React.FC<Props> = ({
  survey,
  presentation,
  contentFormat,
  lang,
  langDefault,
  expressionContext,
  onContinue,
  countdown,
}) => {
  const { t } = useTranslation('app-survey')
  const [dataPolicyAccepted, setDataPolicyAccepted] = useState(false)
  const [legalNoticeAccepted, setLegalNoticeAccepted] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)

  const dataPolicy = survey?.dataPolicy || {
    show: false,
    text: { getLang: () => '' },
  }
  const legalNotice = survey?.legalNotice || {
    show: false,
    text: { getLang: () => '' },
  }

  const showDataPolicy = dataPolicy.show
  const showLegalNotice = legalNotice.show
  const showWelcomeMessage = presentation.welcomeMessage

  const dataPolicyUrl = dataPolicy.url?.getLang?.(lang, langDefault)
  const legalNoticeUrl = legalNotice.url?.getLang?.(lang, langDefault)
  const dataPolicyLink = !!dataPolicy.link && !!dataPolicyUrl
  const legalNoticeLink = !!legalNotice.link && !!legalNoticeUrl

  const rawWelcomeMessage =
    survey?.welcomeSection?.desc?.getLang?.(lang, langDefault) ||
    t('welcome.defaultMessage')
  const welcomeMessage = expressionContext
    ? resolveTextExpressions(rawWelcomeMessage, expressionContext, {
        escape: expressionEscapeForContentFormat(contentFormat.format),
      })
    : rawWelcomeMessage

  // Only require checkboxes to be checked if the respective policies are shown
  const canContinue =
    (!showDataPolicy || dataPolicyAccepted) &&
    (!showLegalNotice || legalNoticeAccepted) &&
    countdown === 0

  const handleContinue = () => {
    if (canContinue) {
      onContinue()
    } else if (countdown === 0) {
      setShowWarningModal(true)
    }
  }

  const handleCloseModal = () => {
    setShowWarningModal(false)
  }

  const getWarningMessage = () => {
    const missingItems = []
    if (showDataPolicy && !dataPolicyAccepted) {
      missingItems.push(t('welcome.dataPolicyBadge'))
    }
    if (showLegalNotice && !legalNoticeAccepted) {
      missingItems.push(t('welcome.legalNoticeBadge'))
    }

    if (missingItems.length === 1) {
      return t('welcome.warningSingle', { item: missingItems[0] })
    } else if (missingItems.length === 2) {
      return t('welcome.warningDouble', {
        item1: missingItems[0],
        item2: missingItems[1],
      })
    }
    return t('welcome.warningGeneric')
  }

  return (
    <div className="survey-welcome-container mt-5 space-y-6">
      {showWelcomeMessage && (
        <Card className="welcome-message-section border shadow-sm bg-muted dark:border-muted">
          <CardContent>
            <SurveyContent
              raw={welcomeMessage}
              format={contentFormat.format}
              scriptTagsAllowed={contentFormat.scriptTagsAllowed}
              className="welcome-content html-content text-base"
            />
          </CardContent>
        </Card>
      )}

      {showDataPolicy && (
        <Card className="policy-section data-policy-section hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                <Badge variant="secondary">
                  {t('welcome.dataPolicyBadge')}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {dataPolicyLink ? (
              <a
                href={dataPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="policy-content-link text-sm mb-4 inline-block underline"
              >
                {t('welcome.dataPolicyBadge')}
              </a>
            ) : (
              <SurveyContent
                raw={dataPolicy.text?.getLang?.(lang, langDefault)}
                format={contentFormat.format}
                scriptTagsAllowed={contentFormat.scriptTagsAllowed}
                className="policy-content html-content text-sm mb-4"
              />
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="data-policy-checkbox"
                checked={dataPolicyAccepted}
                onCheckedChange={(checked) =>
                  setDataPolicyAccepted(checked === true)
                }
              />
              <Label
                htmlFor="data-policy-checkbox"
                className="text-sm cursor-pointer"
              >
                {t('welcome.dataPolicyAgree')}
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {showLegalNotice && (
        <Card className="policy-section legal-notice-section hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                <Badge variant="secondary">
                  {t('welcome.legalNoticeBadge')}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {legalNoticeLink ? (
              <a
                href={legalNoticeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="policy-content-link text-sm mb-4 inline-block underline"
              >
                {t('welcome.legalNoticeBadge')}
              </a>
            ) : (
              <SurveyContent
                raw={legalNotice.text?.getLang?.(lang, langDefault)}
                format={contentFormat.format}
                scriptTagsAllowed={contentFormat.scriptTagsAllowed}
                className="policy-content html-content text-sm mb-4"
              />
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="legal-notice-checkbox"
                checked={legalNoticeAccepted}
                onCheckedChange={(checked) =>
                  setLegalNoticeAccepted(checked === true)
                }
              />
              <Label
                htmlFor="legal-notice-checkbox"
                className="text-sm cursor-pointer"
              >
                {t('welcome.legalNoticeAgree')}
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="welcome-navigation flex justify-end mt-8">
        <Button
          size="lg"
          className="survey-welcome-continue-btn shadow-lg"
          onClick={handleContinue}
        >
          {countdown > 0 ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('nav.continueCountdown', { seconds: countdown })}
            </>
          ) : (
            <>
              {t('nav.startSurvey')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-warning">⚠️</span>
              {t('welcome.agreementRequiredTitle')}
            </DialogTitle>
            <DialogDescription>{getWarningMessage()}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCloseModal}>
              <Check className="mr-2 h-4 w-4" />
              {t('welcome.ok')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
