import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Save,
  X,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { isValidCustomAttributeName } from 'veysur-common'

import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import { Spinner } from 'component/shadcn/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'component/shadcn/tooltip'
import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import { SurveyLanguageSelector } from 'appAdmin/component/SurveyEditor/SurveyLanguageSelector'
import { genUniqueId } from 'mzen-id'

import {
  useSurveyParticipantAttributeList,
  useSurveyParticipantAttributeCreate,
  useSurveyParticipantAttributeDelete,
  useSurveyParticipantAttributeBatchSave,
  SurveyParticipantAttributeRow,
} from '../hook'
import { AttributeRow } from './AttributeRow'
import { AttributeRowHeader } from './AttributeRowHeader'
import { RenameAttributeConfirmDialog } from './RenameAttributeConfirmDialog'

type AttributePendingChange = {
  name?: string
  example?: string | null
  required?: boolean
  internal?: boolean
  language?: Record<string, { label?: string; description?: string }>
}
type PendingChanges = Record<string, AttributePendingChange>

const rowId = (row: SurveyParticipantAttributeRow) => row.tempId ?? row.name

export const AttributeManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const survey = useSurveyEditorStore((state) => state.survey)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)
  const setChildNavigationBlocker = useSurveyEditorStore(
    (state) => state.setChildNavigationBlocker,
  )
  const surveyId = survey?._id || ''

  const { systemAttributes, customAttributes, isLoading } =
    useSurveyParticipantAttributeList(surveyId)

  const { surveyParticipantAttributeCreate } =
    useSurveyParticipantAttributeCreate(surveyId)
  const { surveyParticipantAttributeDelete } =
    useSurveyParticipantAttributeDelete(surveyId)
  const { surveyParticipantAttributeBatchSave } =
    useSurveyParticipantAttributeBatchSave(surveyId)

  const [localAttributes, setLocalAttributes] = useState<
    SurveyParticipantAttributeRow[]
  >([])
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({})
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<Error | null>(null)
  const [showRenameConfirm, setShowRenameConfirm] = useState(false)
  const [showSystemAttributes, setShowSystemAttributes] = useState(false)

  const isDirty =
    localAttributes.length > 0 ||
    Object.keys(pendingChanges).length > 0 ||
    pendingOrder !== null

  const localIds = useMemo(
    () => new Set(localAttributes.map(rowId)),
    [localAttributes],
  )

  const allCustomAttributes = useMemo(
    () => [...customAttributes, ...localAttributes],
    [customAttributes, localAttributes],
  )

  const displayCustomAttributes: SurveyParticipantAttributeRow[] = useMemo(
    () =>
      pendingOrder
        ? (pendingOrder
            .map((id) => allCustomAttributes.find((a) => rowId(a) === id))
            .filter(Boolean) as SurveyParticipantAttributeRow[])
        : allCustomAttributes,
    [pendingOrder, allCustomAttributes],
  )

  const sortableIds = displayCustomAttributes.map(rowId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 0.9 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )

  const handleUpdateLanguage = useCallback(
    (
      attributeId: string,
      languageCode: string,
      data: { label?: string; description?: string },
    ) => {
      const isLocal = localAttributes.some((a) => rowId(a) === attributeId)
      if (isLocal) {
        setLocalAttributes((prev) =>
          prev.map((a) =>
            rowId(a) === attributeId
              ? {
                  ...a,
                  languages: {
                    ...a.languages,
                    [languageCode]: {
                      ...a.languages?.[languageCode],
                      ...data,
                    },
                  },
                }
              : a,
          ),
        )
      } else {
        setPendingChanges((prev) => ({
          ...prev,
          [attributeId]: {
            ...prev[attributeId],
            language: {
              ...prev[attributeId]?.language,
              [languageCode]: {
                ...prev[attributeId]?.language?.[languageCode],
                ...data,
              },
            },
          },
        }))
      }
    },
    [localAttributes],
  )

  const handleUpdateField = useCallback(
    (
      attributeId: string,
      field: 'required' | 'internal' | 'example',
      value: boolean | string,
    ) => {
      const isLocal = localAttributes.some((a) => rowId(a) === attributeId)
      if (isLocal) {
        setLocalAttributes((prev) =>
          prev.map((a) =>
            rowId(a) === attributeId ? { ...a, [field]: value } : a,
          ),
        )
      } else {
        setPendingChanges((prev) => ({
          ...prev,
          [attributeId]: {
            ...prev[attributeId],
            [field]: value,
          },
        }))
      }
    },
    [localAttributes],
  )

  const handleDelete = useCallback(
    (attributeId: string) => {
      const isLocal = localAttributes.some((a) => rowId(a) === attributeId)
      if (isLocal) {
        setLocalAttributes((prev) =>
          prev.filter((a) => rowId(a) !== attributeId),
        )
        setPendingOrder((prev) =>
          prev ? prev.filter((n) => n !== attributeId) : null,
        )
      } else {
        surveyParticipantAttributeDelete(attributeId)
      }
    },
    [localAttributes, surveyParticipantAttributeDelete],
  )

  const handleRename = useCallback(
    (attributeId: string, newName: string) => {
      const isLocal = localAttributes.some((a) => rowId(a) === attributeId)
      if (isLocal) {
        setLocalAttributes((prev) =>
          prev.map((a) =>
            rowId(a) === attributeId ? { ...a, name: newName } : a,
          ),
        )
        // pendingOrder stores tempId for local rows, so no update needed on rename
      } else {
        // newName === attributeId means "no rename" — drop any staged rename
        // (and the whole entry if nothing else is pending) so isDirty stays
        // accurate as the user edits the name field.
        setPendingChanges((prev) => {
          const next = { ...prev }
          const entry = { ...next[attributeId] }
          if (newName === attributeId) {
            delete entry.name
          } else {
            entry.name = newName
          }
          if (Object.keys(entry).length === 0) {
            delete next[attributeId]
          } else {
            next[attributeId] = entry
          }
          return next
        })
      }
    },
    [localAttributes],
  )

  const handleAddAttribute = useCallback(() => {
    const tempId = genUniqueId()
    const newRow: SurveyParticipantAttributeRow = {
      kind: 'custom',
      name: '',
      tempId,
      required: false,
      internal: false,
      example: null,
      label: '',
      description: '',
      languages: {},
    }
    setLocalAttributes((prev) => [...prev, newRow])
    setPendingOrder((prev) => (prev !== null ? [...prev, tempId] : null))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const currentIds = pendingOrder ?? allCustomAttributes.map(rowId)
      const oldIndex = currentIds.indexOf(active.id as string)
      const newIndex = currentIds.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = [...currentIds]
      reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, active.id as string)
      setPendingOrder(reordered)
    },
    [allCustomAttributes, pendingOrder],
  )

  const handleMove = useCallback(
    (index: number, newIndex: number) => {
      const currentIds = pendingOrder ?? allCustomAttributes.map(rowId)
      if (newIndex < 0 || newIndex >= currentIds.length) return
      const reordered = [...currentIds]
      const [moved] = reordered.splice(index, 1)
      reordered.splice(newIndex, 0, moved)
      setPendingOrder(reordered)
    },
    [allCustomAttributes, pendingOrder],
  )

  const pendingRenames = useMemo(
    () =>
      Object.entries(pendingChanges)
        .filter(
          ([name, change]) => change.name !== undefined && change.name !== name,
        )
        .map(([name, change]) => ({ from: name, to: change.name as string })),
    [pendingChanges],
  )

  const performSave = useCallback(async () => {
    setShowRenameConfirm(false)

    if (localAttributes.some((a) => !a.name.trim())) {
      const error = new Error(
        'All new attributes must have a name before saving.',
      )
      setSaveError(error)
      throw error
    }

    const namesToValidate = [
      ...localAttributes.map((a) => a.name),
      ...Object.values(pendingChanges)
        .map((change) => change.name)
        .filter((name): name is string => name !== undefined),
    ]
    for (const attributeName of namesToValidate) {
      const result = isValidCustomAttributeName(attributeName)
      if (!result.valid) {
        const error = new Error(
          `Attribute name '${attributeName}': ${result.reason}`,
        )
        setSaveError(error)
        throw error
      }
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      for (const local of localAttributes) {
        await surveyParticipantAttributeCreate({
          name: local.name,
          required: local.required,
          internal: local.internal,
          ...(local.example != null ? { example: local.example } : {}),
        })
      }

      const changes = [
        ...Object.entries(pendingChanges).map(([attributeName, change]) => ({
          attributeName,
          ...(change.name !== undefined ? { newName: change.name } : {}),
          ...(change.example !== undefined ||
          change.required !== undefined ||
          change.internal !== undefined
            ? {
                fields: {
                  ...(change.example !== undefined
                    ? { example: change.example }
                    : {}),
                  ...(change.required !== undefined
                    ? { required: change.required }
                    : {}),
                  ...(change.internal !== undefined
                    ? { internal: change.internal }
                    : {}),
                },
              }
            : {}),
          ...(change.language ? { language: change.language } : {}),
        })),
        ...localAttributes
          .filter((a) => Object.keys(a.languages).length > 0)
          .map((a) => ({ attributeName: a.name, language: a.languages })),
      ]

      const resolvedOrder = pendingOrder
        ? pendingOrder.map((id) => {
            const local = localAttributes.find((a) => a.tempId === id)
            return local ? local.name : id
          })
        : null

      if (changes.length > 0 || resolvedOrder) {
        await surveyParticipantAttributeBatchSave({
          changes,
          ...(resolvedOrder ? { orderedAttributeNames: resolvedOrder } : {}),
        })
      }

      setLocalAttributes([])
      setPendingChanges({})
      setPendingOrder(null)
      setFormKey((prev) => prev + 1)
    } catch (error) {
      const wrapped =
        error instanceof Error ? error : new Error('Failed to save changes')
      setSaveError(wrapped)
      throw wrapped
    } finally {
      setIsSaving(false)
    }
  }, [
    localAttributes,
    pendingChanges,
    pendingOrder,
    surveyParticipantAttributeCreate,
    surveyParticipantAttributeBatchSave,
  ])

  const handleSave = useCallback(() => {
    if (pendingRenames.length > 0) {
      setShowRenameConfirm(true)
      return
    }
    void performSave().catch(() => {})
  }, [pendingRenames, performSave])

  const handleCancel = useCallback(() => {
    setShowRenameConfirm(false)
    setLocalAttributes([])
    setPendingChanges({})
    setPendingOrder(null)
    setFormKey((prev) => prev + 1)
  }, [])

  useEffect(() => {
    setChildNavigationBlocker({
      condition: isDirty,
      message: 'You have unsaved changes to participant attributes.',
      onSaveAndContinue: performSave,
    })
    return () => setChildNavigationBlocker(null)
  }, [isDirty, performSave, setChildNavigationBlocker])

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${surveyId}/participant`}
        onBackClick={() => navigate(`/survey/${surveyId}/participant`)}
        pageHeader={
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Participant Attributes</h2>
              <p className="text-muted-foreground text-sm">
                Manage system and custom attributes available for survey
                participants.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <SurveyLanguageSelector />
              {saveError && (
                <Alert variant="destructive" className="mb-0 py-1 px-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {saveError.message}
                  </AlertDescription>
                </Alert>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCancel}
                      disabled={!isDirty || isSaving}
                      aria-label="Cancel changes"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={handleSave}
                      disabled={!isDirty || isSaving}
                      aria-label="Save changes"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex justify-center py-5">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="self-start -ml-2 text-muted-foreground"
                onClick={() => setShowSystemAttributes((v) => !v)}
              >
                {showSystemAttributes ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {showSystemAttributes
                  ? 'Hide system attributes'
                  : 'Show system attributes'}
              </Button>
              {showSystemAttributes && (
                <>
                  <AttributeRowHeader />
                  {systemAttributes.map((row) => (
                    <AttributeRow
                      key={`${rowId(row)}-${formKey}`}
                      row={row}
                      lang={langEditing}
                      langDefault={langDefault}
                      index={-1}
                      totalCount={0}
                      onUpdateLanguage={handleUpdateLanguage}
                      onUpdateField={handleUpdateField}
                      onDelete={handleDelete}
                      onRename={handleRename}
                    />
                  ))}
                </>
              )}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortableIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  <AttributeRowHeader showActions />
                  {displayCustomAttributes.map((row, index) => (
                    <AttributeRow
                      key={`${rowId(row)}-${formKey}`}
                      row={row}
                      lang={langEditing}
                      langDefault={langDefault}
                      index={index}
                      totalCount={displayCustomAttributes.length}
                      onUpdateLanguage={handleUpdateLanguage}
                      onUpdateField={handleUpdateField}
                      onDelete={handleDelete}
                      onRename={handleRename}
                      onMoveUp={() => handleMove(index, index - 1)}
                      onMoveDown={() => handleMove(index, index + 1)}
                      isLocal={localIds.has(rowId(row))}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button
              className="self-start"
              variant="outline"
              size="sm"
              onClick={handleAddAttribute}
            >
              <Plus className="h-4 w-4" />
              Add Attribute
            </Button>
          </div>
        )}
      </SurveyPageContent>

      <RenameAttributeConfirmDialog
        open={showRenameConfirm}
        renames={pendingRenames}
        onConfirm={() => {
          void performSave().catch(() => {})
        }}
        onCancel={() => setShowRenameConfirm(false)}
      />
    </SurveyEditorNavContainer>
  )
}

export default AttributeManagementPage
