import React from 'react'
import { CheckCircle } from 'lucide-react'
import { Survey as SurveyEntity, SurveySection } from 'veysur-common'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from 'component/shadcn/sheet'
import { Badge } from 'component/shadcn/badge'
import { Separator } from 'component/shadcn/separator'
import { Button } from 'component/shadcn/button'
import { sanitizeHtml } from 'common/sanitizeHtml'

type IndexMenuQuestion = {
  _id: string
  code?: string
  title?: { getLang: (lang: string, langDefault: string) => string }
}

type Props = {
  survey?: SurveyEntity
  lang: string
  langDefault: string
  allQuestions: Array<{
    question: IndexMenuQuestion
    group: SurveySection
  }>
  currentQuestionIndex?: number
  onQuestionClick?: (questionIndex: number) => void
  show: boolean
  onHide: () => void
}

export const SurveyIndexMenu: React.FC<Props> = ({
  lang,
  langDefault,
  allQuestions,
  currentQuestionIndex,
  onQuestionClick,
  show,
  onHide,
}) => {
  const handleQuestionClick = (questionIndex: number) => {
    if (onQuestionClick) {
      onQuestionClick(questionIndex)
    }
    onHide()
  }

  // Group questions by group for better organization
  const groupedQuestions = React.useMemo(() => {
    const groups: Record<
      string,
      Array<{
        question: IndexMenuQuestion
        group: SurveySection
        index: number
      }>
    > = {}

    allQuestions.forEach(({ question, group }, index) => {
      const groupName =
        group.name?.getLang(lang, langDefault) || `Group ${index + 1}`
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push({ question, group, index })
    })

    return groups
  }, [allQuestions, lang, langDefault])

  return (
    <Sheet open={show} onOpenChange={onHide}>
      <SheetContent side="left" className="w-[350px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Question Index</SheetTitle>
        </SheetHeader>
        <Separator />
        <div className="mt-4 overflow-y-auto max-h-[calc(100vh-120px)] space-y-6 px-4">
          {Object.entries(groupedQuestions).map(([groupName, questions]) => (
            <div key={groupName}>
              <h3 className="text-sm font-semibold text-primary mb-3">
                {groupName}
              </h3>
              <div className="space-y-1">
                {questions.map(({ question, index }) => (
                  <Button
                    key={question._id}
                    variant={
                      currentQuestionIndex === index ? 'default' : 'ghost'
                    }
                    onClick={() => handleQuestionClick(index)}
                    disabled={!onQuestionClick}
                    className="w-full justify-start h-auto py-3 px-3 text-left"
                  >
                    <div className="flex items-start gap-3 w-full">
                      <Badge
                        variant={
                          currentQuestionIndex === index
                            ? 'secondary'
                            : 'outline'
                        }
                        className="flex-shrink-0 mt-0.5"
                      >
                        {index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(
                              question.title?.getLang(lang, langDefault) ||
                                question.code ||
                                `Question ${index + 1}`,
                            ),
                          }}
                        />
                      </div>
                      {currentQuestionIndex === index && (
                        <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
