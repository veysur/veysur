import React, { useState, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

import { isValidCustomAttributeName } from 'veysur-common'

import { cn } from 'common/cn'
import { Badge } from 'component/shadcn/badge'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Checkbox } from 'component/shadcn/checkbox'
import { FieldError } from 'component/Form'
import { MoveNav } from 'appAdmin/component/SurveyEditor/MoveNav'

import { SurveyParticipantAttributeRow } from '../hook'
import { ParticipantAttributeRowAction } from './ParticipantAttributeRowAction'

type Props = {
  row: SurveyParticipantAttributeRow
  lang: string
  langDefault: string
  index: number
  totalCount: number
  onUpdateLanguage: (
    attributeName: string,
    languageCode: string,
    data: { label?: string; description?: string },
  ) => void
  onUpdateField: (
    attributeName: string,
    field: 'required' | 'internal' | 'example',
    value: boolean | string,
  ) => void
  onDelete: (attributeName: string) => void
  onRename: (attributeName: string, newName: string) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  isLocal?: boolean
}

export const AttributeRow: React.FC<Props> = ({
  row,
  lang,
  langDefault,
  index,
  totalCount,
  onUpdateLanguage,
  onUpdateField,
  onDelete,
  onRename,
  onMoveUp,
  onMoveDown,
  isLocal,
}) => {
  const isCustom = row.kind === 'custom'
  const attributeId = row.tempId ?? row.name

  const [label, setLabel] = useState(
    () => (row.languages?.[lang] ?? row.languages?.[langDefault])?.label ?? '',
  )
  const [description, setDescription] = useState(
    () =>
      (row.languages?.[lang] ?? row.languages?.[langDefault])?.description ??
      '',
  )
  const [example, setExample] = useState(row.example ?? '')
  const [name, setName] = useState(row.name)
  const [required, setRequired] = useState(row.required)
  const [internal, setInternal] = useState(row.internal)
  const [hasBlurred, setHasBlurred] = useState(false)
  const trimmedName = name.trim()
  const nameValidation = trimmedName
    ? isValidCustomAttributeName(trimmedName)
    : null
  const nameError = !trimmedName
    ? 'Name is required'
    : nameValidation && !nameValidation.valid
      ? nameValidation.reason
      : undefined
  const showNameError = isCustom && hasBlurred && !!nameError

  // Re-sync local editing state from props at render time (React's
  // "adjusting state when a prop changes" pattern) instead of in an effect,
  // to avoid an extra render showing stale values first.
  const [prevRowName, setPrevRowName] = useState(row.name)
  if (row.name !== prevRowName) {
    setPrevRowName(row.name)
    setName(row.name)
  }

  const [prevLangSync, setPrevLangSync] = useState({
    lang,
    langDefault,
    languages: row.languages,
  })
  if (
    prevLangSync.lang !== lang ||
    prevLangSync.langDefault !== langDefault ||
    prevLangSync.languages !== row.languages
  ) {
    setPrevLangSync({ lang, langDefault, languages: row.languages })
    const langData = row.languages?.[lang] ?? row.languages?.[langDefault]
    setLabel(langData?.label ?? '')
    setDescription(langData?.description ?? '')
  }

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: attributeId, disabled: !isCustom })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleRequiredChange = useCallback(
    (checked: boolean) => {
      setRequired(checked)
      onUpdateField(attributeId, 'required', checked)
    },
    [onUpdateField, attributeId],
  )

  const handleInternalChange = useCallback(
    (checked: boolean) => {
      setInternal(checked)
      onUpdateField(attributeId, 'internal', checked)
    },
    [onUpdateField, attributeId],
  )

  const handleDelete = useCallback(() => {
    onDelete(attributeId)
  }, [onDelete, attributeId])

  // For existing (non-local) rows, stage the rename as the user types so the
  // page's dirty state and Save button update immediately, matching the other
  // fields. Only a valid, changed name is staged; anything else clears any
  // previously staged rename by passing the original name back up.
  const handleNameChange = useCallback(
    (value: string) => {
      setName(value)
      if (!isCustom || isLocal) return
      const trimmed = value.trim()
      const isValidRename =
        !!trimmed &&
        trimmed !== row.name &&
        isValidCustomAttributeName(trimmed).valid
      onRename(attributeId, isValidRename ? trimmed : row.name)
    },
    [isCustom, isLocal, row.name, attributeId, onRename],
  )

  const handleNameBlur = useCallback(() => {
    if (!isCustom) return
    setHasBlurred(true)
    if (!trimmedName) {
      if (!isLocal) setName(row.name)
      return
    }
    if (nameValidation && !nameValidation.valid) {
      // Keep the invalid text visible with its error message rather than
      // propagating it upward or silently reverting it.
      return
    }
    if (trimmedName === row.name) return
    // Local rows only stage on blur; existing rows already staged on change.
    if (isLocal) onRename(attributeId, trimmedName)
  }, [
    isCustom,
    isLocal,
    trimmedName,
    nameValidation,
    row.name,
    attributeId,
    onRename,
  ])

  return (
    <div
      ref={isCustom ? setNodeRef : undefined}
      style={isCustom ? style : undefined}
      className={cn(
        'flex flex-row items-start xl:items-center gap-3 xl:gap-2 rounded-md border p-3',
        isCustom ? 'bg-background' : 'bg-muted/40',
      )}
    >
      {isCustom ? (
        <GripVertical
          {...listeners}
          {...attributes}
          className="drag-handle mt-2 xl:mt-0 h-4 w-4 shrink-0 cursor-grab text-muted-foreground"
        />
      ) : (
        <div className="mt-2 xl:mt-0 h-4 w-4 shrink-0" />
      )}

      <div className="flex-1 grid gap-3 md:grid-cols-2 xl:flex xl:items-center xl:gap-2 xl:min-w-0">
        <div className="flex items-center gap-2 md:col-span-2 xl:contents">
          <div className="xl:w-16 xl:shrink-0">
            <Badge
              variant={isCustom ? 'default' : 'secondary'}
              className="shrink-0"
            >
              {isCustom ? 'Custom' : 'System'}
            </Badge>
          </div>

          <div className="relative flex-1 xl:w-44 xl:shrink-0 xl:flex-none">
            {isCustom ? (
              <>
                <Input
                  className={cn(
                    'font-mono text-sm',
                    showNameError && 'border-destructive',
                  )}
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={handleNameBlur}
                  placeholder="Attribute name"
                />
                {showNameError && (
                  <FieldError className="absolute left-0 top-full z-10 mt-1 w-max max-w-64">
                    {nameError}
                  </FieldError>
                )}
              </>
            ) : (
              <span className="font-mono text-sm">{row.name}</span>
            )}
          </div>
        </div>

        <div className="xl:w-32 xl:shrink-0">
          <Label htmlFor={`label-${row.name}`} className="xl:sr-only">
            Label
          </Label>
          <Input
            id={`label-${row.name}`}
            value={isCustom ? label : row.label}
            onChange={(e) => {
              setLabel(e.target.value)
              if (isCustom)
                onUpdateLanguage(attributeId, lang, {
                  label: e.target.value,
                  description,
                })
            }}
            disabled={!isCustom}
            placeholder="Label"
          />
        </div>

        <div className="xl:flex-1 xl:min-w-0">
          <Label htmlFor={`description-${row.name}`} className="xl:sr-only">
            Description
          </Label>
          <Input
            id={`description-${row.name}`}
            value={isCustom ? description : row.description || ''}
            onChange={(e) => {
              setDescription(e.target.value)
              if (isCustom)
                onUpdateLanguage(attributeId, lang, {
                  label,
                  description: e.target.value,
                })
            }}
            disabled={!isCustom}
            placeholder="Description"
          />
        </div>

        <div className="xl:w-24 xl:shrink-0">
          <Label htmlFor={`example-${row.name}`} className="xl:sr-only">
            Example
          </Label>
          <Input
            id={`example-${row.name}`}
            value={isCustom ? example : row.example || ''}
            onChange={(e) => {
              setExample(e.target.value)
              if (isCustom)
                onUpdateField(attributeId, 'example', e.target.value)
            }}
            disabled={!isCustom}
            placeholder="Example"
          />
        </div>

        <div className="flex items-center gap-4 xl:gap-2 xl:shrink-0">
          <div className="flex items-center gap-2 xl:w-8 xl:justify-center">
            <Checkbox
              id={`required-${row.name}`}
              checked={required}
              disabled={!isCustom}
              onCheckedChange={(checked) =>
                handleRequiredChange(checked === true)
              }
            />
            <Label htmlFor={`required-${row.name}`} className="mb-0 xl:sr-only">
              Required
            </Label>
          </div>
          <div className="flex items-center gap-2 xl:w-8 xl:justify-center">
            <Checkbox
              id={`internal-${row.name}`}
              checked={internal}
              disabled={!isCustom}
              onCheckedChange={(checked) =>
                handleInternalChange(checked === true)
              }
            />
            <Label htmlFor={`internal-${row.name}`} className="mb-0 xl:sr-only">
              Internal
            </Label>
          </div>
        </div>
      </div>

      {isCustom && (
        <div className="flex items-center gap-1 shrink-0">
          <ParticipantAttributeRowAction
            attributeName={row.name}
            onDelete={handleDelete}
          />
          <MoveNav
            layout="inline"
            onMoveUp={index === 0 ? undefined : onMoveUp}
            onMoveDown={index === totalCount - 1 ? undefined : onMoveDown}
            itemType="attribute"
          />
        </div>
      )}
    </div>
  )
}

export default AttributeRow
