import React, { useState } from 'react'
import { Plus, CircleHelp, FileText, Layers } from 'lucide-react'

import { SurveyAttributes } from 'veysur-common'

import { cn } from 'common'
import { Button } from 'component/shadcn/button'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from 'component/shadcn/popover'
import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'
import { QuestionTypeModal } from './QuestionTypeModal'
import { ContentTypeModal } from './ContentTypeModal'

type Props = {
  sectionId?: string
  prevElementId?: string
  className?: string
}

export const AddElementPanel: React.FC<Props> = ({
  sectionId,
  prevElementId,
  className,
}) => {
  const operations = useSurveyEditorStore((state) => state.operations)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [isContentModalOpen, setIsContentModalOpen] = useState(false)

  const handleAddQuestionClick = () => {
    setIsPopoverOpen(false)
    setIsQuestionModalOpen(true)
  }

  const handleAddContentClick = () => {
    setIsPopoverOpen(false)
    setIsContentModalOpen(true)
  }

  const handleAddQuestion = (config: {
    type: string
    attributes?: SurveyAttributes
  }) => {
    if (sectionId) {
      operations?.addQuestion(sectionId, {
        afterId: prevElementId,
        type: config.type,
        attributes: config.attributes,
        lang: langDefault,
      })
    }
    setIsQuestionModalOpen(false)
  }

  const handleAddGroup = () => {
    operations?.addSection({
      afterId: sectionId,
    })
    setIsPopoverOpen(false)
  }

  const handleAddContent = (config: { type: string }) => {
    if (sectionId) {
      operations?.addContent(sectionId, {
        type: config.type,
        afterId: prevElementId,
        lang: langDefault,
      })
    }
    setIsContentModalOpen(false)
  }

  return (
    <div
      className={cn(['add-element-panel my-10 mx-4', className])}
      data-testid="add-element-panel"
    >
      <div className="flex items-center justify-center">
        <hr className="flex-grow mr-3" />

        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="add-trigger-btn flex justify-center items-center gap-2 px-3"
              data-testid="add-element-trigger"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <div className="flex flex-col gap-1">
              {sectionId && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  data-testid="add-question-trigger"
                  onClick={handleAddQuestionClick}
                >
                  <CircleHelp className="h-4 w-4" />
                  Add Question
                </Button>
              )}
              {sectionId && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  data-testid="add-content-trigger"
                  onClick={handleAddContentClick}
                >
                  <FileText className="h-4 w-4" />
                  Add Content
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                data-testid="add-group-trigger"
                onClick={handleAddGroup}
              >
                <Layers className="h-4 w-4" />
                Add Group
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <hr className="flex-grow ml-3" />
      </div>

      {sectionId && (
        <QuestionTypeModal
          key={isQuestionModalOpen ? 'open' : 'closed'}
          open={isQuestionModalOpen}
          onOpenChange={setIsQuestionModalOpen}
          onConfirm={handleAddQuestion}
        />
      )}

      {sectionId && (
        <ContentTypeModal
          key={isContentModalOpen ? 'content-open' : 'content-closed'}
          open={isContentModalOpen}
          onOpenChange={setIsContentModalOpen}
          onConfirm={handleAddContent}
        />
      )}
    </div>
  )
}
