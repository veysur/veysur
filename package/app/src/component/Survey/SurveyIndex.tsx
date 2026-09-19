import React from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SurveyQuestion, SurveySection } from 'veysur-common'

import { Card, CardContent } from 'component/shadcn/card'
import { Badge } from 'component/shadcn/badge'
import { Button } from 'component/shadcn/button'
import { Separator } from 'component/shadcn/separator'
import { sanitizeHtml } from 'common/sanitizeHtml'

type Props = {
  lang: string
  langDefault: string
  allQuestions: Array<{ question: SurveyQuestion; group: SurveySection }>
  onContinue: () => void
  onBack?: () => void
  canGoBack?: boolean
  onQuestionClick?: (questionIndex: number) => void
}

export const SurveyIndex: React.FC<Props> = ({
  lang,
  langDefault,
  allQuestions,
  onContinue,
  onBack,
  canGoBack,
  onQuestionClick,
}) => {
  const { t } = useTranslation('app-survey')

  const handleQuestionClick = (questionIndex: number) => {
    if (onQuestionClick) {
      onQuestionClick(questionIndex)
    }
  }

  // Group questions by group to show group names
  const groupedQuestions = allQuestions.reduce(
    (acc, { question, group }, index) => {
      const groupName =
        group.name?.getLang(lang, langDefault) ||
        t('index.groupFallback', { number: index + 1 })
      if (!acc[groupName]) {
        acc[groupName] = []
      }
      acc[groupName].push({ question, group, originalIndex: index })
      return acc
    },
    {} as Record<
      string,
      Array<{
        question: SurveyQuestion
        group: SurveySection
        originalIndex: number
      }>
    >,
  )

  return (
    <div className="survey-question-index">
      <h2 className="text-2xl font-bold mb-6">{t('index.title')}</h2>

      <Card>
        <CardContent>
          <div className="question-index-list space-y-6">
            {Object.entries(groupedQuestions).map(([groupName, questions]) => (
              <div key={groupName}>
                <h3 className="text-primary mb-3">{groupName}</h3>
                <Separator className="mb-3" />
                <div className="space-y-2 pl-2">
                  {questions.map(({ question, originalIndex }) => (
                    <Button
                      key={question._id}
                      variant="ghost"
                      className="w-full justify-start h-auto py-3 px-3 hover:bg-muted"
                      style={{
                        cursor: onQuestionClick ? 'pointer' : 'default',
                      }}
                      onClick={() =>
                        onQuestionClick && handleQuestionClick(originalIndex)
                      }
                    >
                      <div className="flex items-start gap-3 w-full">
                        <Badge
                          variant="secondary"
                          className="flex-shrink-0 mt-0.5"
                        >
                          {originalIndex + 1}
                        </Badge>
                        <span
                          className="flex-grow-1 text-left text-sm"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(
                              question.code ||
                                t('index.questionFallback', {
                                  number: originalIndex + 1,
                                }),
                            ),
                          }}
                        />
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mt-6">
        {canGoBack && onBack ? (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('nav.back')}
          </Button>
        ) : (
          <div></div>
        )}
        <Button size="lg" onClick={onContinue} className="shadow-lg">
          {t('nav.startSurvey')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
