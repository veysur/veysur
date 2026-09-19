// cspell:ignore youtu nocookie
import React, { useCallback, useMemo, useState } from 'react'
import { GitBranch, Trash2 } from 'lucide-react'
import {
  ATTRIBUTE_CONDITION,
  CONTENT_TYPE_YOUTUBE,
  SurveyContent,
  parseYoutubeUrl,
} from 'veysur-common'

import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'component/shadcn/tooltip'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import { FieldError } from 'component/Form'
import {
  DialogConfirmClickable,
  ConfirmDialog,
} from 'component/DialogConfirmClickable'
import { ConditionEditor } from 'appAdmin/component/SurveyAttribute'
import { createConditionConfig } from 'appAdmin/component/SurveyAttributesPanel/attribute/createAttributeConfig'

import { CONTENT_ID_PREFIX, SURVEY_ENTITY_TYPE_CONTENT } from './constant'
import {
  useSurveyEditorFocus,
  useSurveyEditorStore,
  useStructuralChangeGuard,
  useTextExpressionVariablePicker,
  useSurveyContentFormat,
} from './hook'
import { MoveNav } from './MoveNav'
import { useSurveyEditorValidation } from './validation'

interface ContentViewProps {
  isFirst: boolean
  isLast: boolean
  element: SurveyContent
}

const ContentViewComponent: React.FC<ContentViewProps> = ({
  isFirst,
  isLast,
  element,
}) => {
  const [isConditionOpen, setIsConditionOpen] = useState(false)
  const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()
  const { getFieldError } = useSurveyEditorValidation()
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)

  const focused =
    surveyFocus?.entityType === SURVEY_ENTITY_TYPE_CONTENT &&
    surveyFocus?.id === element._id

  const handleOnFocus = useCallback(() => {
    setSurveyFocus({
      entityType: SURVEY_ENTITY_TYPE_CONTENT,
      id: element._id,
    })
  }, [setSurveyFocus, element._id])

  const updateContentText = useSurveyEditorStore(
    (state) => state.operations?.updateContentText,
  )
  const setContentYoutubeUrl = useSurveyEditorStore(
    (state) => state.operations?.setContentYoutubeUrl,
  )
  const updateContentCondition = useSurveyEditorStore(
    (state) => state.operations?.updateContentCondition,
  )
  const deleteContent = useSurveyEditorStore(
    (state) => state.operations?.deleteContent,
  )
  const moveContentUp = useSurveyEditorStore(
    (state) => state.operations?.moveContentUp,
  )
  const moveContentDown = useSurveyEditorStore(
    (state) => state.operations?.moveContentDown,
  )

  const { variablePickerGroups } = useTextExpressionVariablePicker(element)
  const { format: contentFormat } = useSurveyContentFormat()

  const {
    guardQuestionMoveUp,
    guardQuestionMoveDown,
    dialogState: moveDialogState,
    closeDialog: closeMoveDialog,
  } = useStructuralChangeGuard()

  const handleMoveUp = useCallback(() => {
    guardQuestionMoveUp(element._id, () => moveContentUp?.(element._id))
  }, [guardQuestionMoveUp, moveContentUp, element._id])

  const handleMoveDown = useCallback(() => {
    guardQuestionMoveDown(element._id, () => moveContentDown?.(element._id))
  }, [guardQuestionMoveDown, moveContentDown, element._id])

  const handleTextChange = useCallback(
    (text: string) => {
      updateContentText?.(element._id, text, langEditing, langDefault)
    },
    [updateContentText, element._id, langEditing, langDefault],
  )

  const handleDelete = useCallback(() => {
    deleteContent?.(element._id)
  }, [deleteContent, element._id])

  const conditionConfig = useMemo(
    () => createConditionConfig(ATTRIBUTE_CONDITION),
    [],
  )
  const handleConditionChange = useCallback(
    async (value: string | null) => {
      await updateContentCondition?.(element._id, value)
    },
    [updateContentCondition, element._id],
  )

  const textValue = useMemo(
    () => element.text?.getLang(langEditing, '') ?? '',
    [element.text, langEditing],
  )
  const textErrors =
    getFieldError('content', element._id, `text.${langEditing}`) ?? []

  const isYoutube = element.type === CONTENT_TYPE_YOUTUBE
  const youtube = element.config?.youtube ?? null
  const parsed = youtube?.url ? parseYoutubeUrl(youtube.url) : null
  const embedSrc = parsed
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        parsed.videoId,
      )}` + (parsed.startAt ? `?start=${Math.floor(parsed.startAt)}` : '')
    : null

  const shortText = stripHtml(
    element.text?.getLang(langEditing, langDefault) || '',
  )
  const shortLabel =
    shortText.length > 30
      ? `${shortText.substring(0, 30)}...`
      : shortText || 'content element'

  const moveNav = (
    <MoveNav
      className={cn(['absolute top-4 -right-14'])}
      onMoveUp={isFirst ? undefined : handleMoveUp}
      onMoveDown={isLast ? undefined : handleMoveDown}
    />
  )

  return (
    <div
      id={`${CONTENT_ID_PREFIX}${element._id}`}
      data-testid="content-container"
      className={cn(
        'content mb-10 group relative transition-colors rounded-md p-4 mb-4 hover:bg-editor-active',
        { 'bg-editor-active': focused },
      )}
    >
      <div className="grow relative" onClick={handleOnFocus}>
        <div className="flex gap-1">
          <div className="flex-1 min-w-0">
            {element.condition && (
              <div className="flex items-center gap-1 mb-1 text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsConditionOpen(true)}
                      className="h-6 w-6 flex-shrink-0"
                    >
                      <GitBranch className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Edit display condition</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {isYoutube ? (
              <div className="space-y-2">
                <div>
                  <Label htmlFor={`yt-url-${element._id}`} className="text-sm">
                    YouTube URL
                  </Label>
                  <Input
                    id={`yt-url-${element._id}`}
                    value={youtube?.url ?? ''}
                    placeholder="https://www.youtube.com/watch?v=..."
                    onFocus={handleOnFocus}
                    onChange={(e) =>
                      setContentYoutubeUrl?.(element._id, e.target.value)
                    }
                  />
                  {youtube?.url && !parsed && (
                    <FieldError
                      errors={['That does not look like a YouTube video URL.']}
                    />
                  )}
                </div>
                {embedSrc && (
                  <div
                    className="relative w-full overflow-hidden rounded-md bg-muted"
                    style={{ aspectRatio: '16 / 9' }}
                  >
                    <iframe
                      className="absolute inset-0 h-full w-full border-0"
                      src={embedSrc}
                      title="YouTube preview"
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-sm">Caption (optional)</Label>
                  <ContentEditor
                    key={langEditing}
                    value={textValue}
                    variant="inline"
                    placeholder="Caption shown below the video"
                    withToolbar={true}
                    format={contentFormat}
                    variablePickerGroups={variablePickerGroups}
                    onChange={handleTextChange}
                    onFocus={handleOnFocus}
                    onClick={handleOnFocus}
                    testId={`content-editor-${element._id}`}
                  />
                  <FieldError errors={textErrors} />
                </div>
              </div>
            ) : (
              <div>
                <ContentEditor
                  key={langEditing}
                  value={textValue}
                  variant="inline"
                  placeholder="Your text here"
                  withToolbar={true}
                  toolbarExtra={true}
                  format={contentFormat}
                  variablePickerGroups={variablePickerGroups}
                  onChange={handleTextChange}
                  onFocus={handleOnFocus}
                  onClick={handleOnFocus}
                  testId={`content-editor-${element._id}`}
                />
                <FieldError errors={textErrors} />
              </div>
            )}
          </div>

          <div className="flex flex-col items-end flex-shrink-0 -mr-1">
            <DialogConfirmClickable
              variant="link-destructive"
              size="sm"
              title="Delete content element"
              message={`Are you sure you want to delete "${shortLabel}"?`}
              comment="This cannot be undone."
              actionText="Delete"
              confirmAction={handleDelete}
              className={cn(
                'transition-opacity',
                focused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              <Trash2 className="h-4 w-4" />
            </DialogConfirmClickable>
          </div>
        </div>
      </div>

      {focused && moveNav}

      {isConditionOpen && (
        <ConditionEditor
          config={conditionConfig}
          entity={element}
          value={element.condition ?? ''}
          onChange={handleConditionChange}
          isValid={true}
          open={isConditionOpen}
          onOpenChange={setIsConditionOpen}
        />
      )}
      <ConfirmDialog
        open={moveDialogState.open}
        title="Moving this element affects a condition"
        message={moveDialogState.message}
        actionText="Move anyway"
        onConfirm={moveDialogState.onConfirm}
        onOpenChange={(open) => !open && closeMoveDialog()}
      />
    </div>
  )
}

export const ContentView = React.memo(
  ContentViewComponent,
  (prev, next) =>
    prev.element._id === next.element._id &&
    prev.element === next.element &&
    prev.isFirst === next.isFirst &&
    prev.isLast === next.isLast,
)
