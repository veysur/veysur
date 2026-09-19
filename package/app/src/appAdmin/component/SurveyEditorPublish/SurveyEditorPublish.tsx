import React, { useState, useEffect, useMemo } from 'react'
import { Globe, AlertCircle } from 'lucide-react'
import { SurveyValidation, SurveyValidationResult, Patch } from 'veysur-common'
import { UseMutationResult } from '@tanstack/react-query'

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'component/shadcn/dialog'
import { Alert, AlertDescription, AlertTitle } from 'component/shadcn/alert'

import { ErrorRest } from 'model/api/ErrorRest'
import { useSurveyParticipantAttributeList } from 'appAdmin/component/SurveyParticipant'

import { useSurveyEditorStore } from '../SurveyEditor/hook/useSurveyEditorStore'
import { useActivePublication } from './hook/useActivePublication'
import { useComparisonSnapshot } from './hook/useComparisonSnapshot'
import { useCompareWithSnapshot } from './hook/useCompareWithSnapshot'
import { PublishButton } from './PublishButton'
import { PublishView } from './PublishView'
import { PublishFooter } from './PublishFooter'

type Props = {
  patchMutation?: UseMutationResult<void, unknown, Patch[]>
}

export const SurveyEditorPublish: React.FC<Props> = ({ patchMutation }) => {
  const [showModal, setShowModal] = useState(false)
  const [validationErrors, setValidationErrors] =
    useState<SurveyValidationResult | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [incompatibleConfirmed, setIncompatibleConfirmed] = useState(false)

  // Unified metadata for both publication and snapshot
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')

  const survey = useSurveyEditorStore((state) => state.survey)
  const operations = useSurveyEditorStore((state) => state.operations)
  const surveyId = survey?._id
  const defaults = useSurveyEditorStore((state) => state.defaults)
  const patchBuffer = useSurveyEditorStore((state) => state.patchBuffer)

  const { systemAttributes, customAttributes } =
    useSurveyParticipantAttributeList(surveyId || '')
  const participantVariableNames = useMemo(
    () =>
      new Set(
        [...systemAttributes, ...customAttributes].map((attr) => attr.name),
      ),
    [systemAttributes, customAttributes],
  )

  const hasPendingSaves = patchBuffer?.hasPending() || false

  const {
    publication,
    snapshot,
    isPublished,
    hasUnpublishedChanges,
    isLoading,
    publish,
    unpublish,
    publishMutation,
    unpublishMutation,
  } = useActivePublication({ surveyId })

  // Determine which snapshot to compare against
  const {
    snapshotId: comparisonSnapshotId,
    isComparingWithPublished,
    isLoading: isLoadingSnapshotSelection,
  } = useComparisonSnapshot({
    surveyId,
    publication,
    enabled: showModal,
  })

  // Fetch comparison
  const { comparison, isLoading: isLoadingComparison } = useCompareWithSnapshot(
    {
      surveyId,
      snapshotId: comparisonSnapshotId,
      enabled: showModal && !!comparisonSnapshotId,
    },
  )

  const isCheckingComparison = isLoadingSnapshotSelection || isLoadingComparison

  useEffect(() => {
    setIncompatibleConfirmed(false)
  }, [comparison?.isCompatible])

  const runValidation = async (): Promise<boolean> => {
    if (!survey || !defaults) return false

    setIsValidating(true)
    setValidationErrors(null)

    try {
      // Resolve defaults / setting inheritance
      const surveyPublish = survey.publishPrep(defaults)

      const validator = new SurveyValidation()
      const result = await validator.validate(
        surveyPublish,
        defaults,
        participantVariableNames,
      )

      if (!result.isValid) {
        setValidationErrors(result)
        return false
      }

      return true
    } finally {
      setIsValidating(false)
    }
  }

  const handleOpenModal = () => {
    setShowModal(true)
    setPublishError(null)
    void runValidation()
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setValidationErrors(null)
    setPublishError(null)
    setLabel('')
    setNotes('')
  }

  const handlePublish = async () => {
    if (!survey || !defaults) return

    // Only prevent publish if equivalent to currently published snapshot
    // Allow publish if equivalent to unpublished snapshot (supports republish)
    if (comparison?.isEquivalent && isComparingWithPublished) {
      // Survey is unchanged from published version - no need to republish
      return
    }

    try {
      const isValid = await runValidation()
      if (!isValid) return

      setPublishError(null)

      // Store the same data to both publication and snapshot
      await publish({
        label: label || undefined,
        notes: notes || undefined,
        snapshotLabel: label || undefined,
        snapshotNotes: notes || undefined,
      })
      setShowModal(false)
      setLabel('')
      setNotes('')
    } catch (error) {
      console.error('Failed to publish survey:', error)
      if (
        error instanceof ErrorRest &&
        error.status === 400 &&
        error.errors &&
        !Array.isArray(error.errors)
      ) {
        // Server-side validation caught something the client-side
        // pre-flight check missed (server is authoritative) — reuse the
        // same alert used for client-side validation failures. The publish
        // endpoint returns `errors` as a path -> messages map.
        setValidationErrors({ isValid: false, errors: error.errors })
      } else {
        setPublishError(
          error instanceof ErrorRest
            ? error.message || 'Failed to publish survey.'
            : 'Failed to publish survey.',
        )
      }
    }
  }

  const handleUnpublish = async () => {
    try {
      await unpublish()
      setShowModal(false)
    } catch (error) {
      console.error('Failed to unpublish survey:', error)
    }
  }

  const handleBooleanChange = (
    section: string,
    field: string,
    value: string | null,
  ) => {
    const boolValue = value === null ? null : value === 'Yes'
    switch (section) {
      case 'access':
        operations?.updateSurveyAccessSetting(field, boolValue)
        break
    }
  }

  const handleStringChange = (
    section: string,
    field: string,
    value: string | null,
  ) => {
    switch (section) {
      case 'schedule':
        operations?.updateSurveyScheduleSetting(field, value)
        break
    }
  }

  if (!survey) return null

  const handlers = {
    handleBooleanChange,
    handleStringChange,
    YES: 'Yes',
    NO: 'No',
  }

  const isSettingsSaving = patchMutation?.isPending || false
  const isPublishPending = publishMutation?.isPending || false
  const isUnpublishPending = unpublishMutation?.isPending || false

  const formatErrorPath = (path: string): string => {
    const parts = path.split('.')
    if (parts[0] === 'title') return 'Survey Title'
    if (parts[0] === 'welcome') return 'Welcome Message'
    if (parts[0] === 'thankYou') return 'Thank-You Message'
    if (parts[0] === 'dataPolicy') return 'Data Policy Text'
    if (parts[0] === 'legalNotice') return 'Legal Notice Text'
    if (parts[0] === 'groups' && parts.length === 1) return 'Question Groups'
    if (parts[0] === 'questions' && parts.length === 1) return 'Questions'
    if (parts[0] === 'groups' && parts[2] === 'condition') {
      const group = survey?.sections.groups().getById(parts[1])
      return `Group Condition (${group?.code || parts[1]})`
    }
    if (parts[0] === 'questions' && parts[2] === 'condition') {
      const question = survey?.elements.getQuestionById(parts[1])
      return `Question Condition (${question?.code || parts[1]})`
    }
    if (parts[0] === 'questions' && parts[2] === 'text') {
      const question = survey?.elements.getQuestionById(parts[1])
      return `Question Text (${question?.code || parts[1]})`
    }
    if (parts[0] === 'questions' && parts[2] === 'detail') {
      const question = survey?.elements.getQuestionById(parts[1])
      return `Question Detail (${question?.code || parts[1]})`
    }
    if (parts[0] === 'groups' && (parts[2] === 'name' || parts[2] === 'desc')) {
      const group = survey?.sections.groups().getById(parts[1])
      const label = parts[2] === 'name' ? 'Name' : 'Description'
      return `Group ${label} (${group?.code || parts[1]})`
    }
    if (
      parts[0] === 'questions' &&
      parts[2] === 'subquestions' &&
      parts[4] === 'text'
    ) {
      const question = survey?.elements.getQuestionById(parts[1])
      const subquestion = question?.subquestions?.getById(parts[3])
      return `Subquestion Text (${question?.code || parts[1]} → ${subquestion?.code || parts[3]})`
    }
    if (
      parts[0] === 'questions' &&
      parts[2] === 'answerOptions' &&
      parts[4] === 'label'
    ) {
      const question = survey?.elements.getQuestionById(parts[1])
      const option = question?.answerOptions?.getById(parts[3])
      return `Answer Option Label (${question?.code || parts[1]} → ${option?.code || parts[3]})`
    }
    if (
      parts[0] === 'questions' &&
      parts[2] === 'answerOptions' &&
      parts[4] === 'image'
    ) {
      const question = survey?.elements.getQuestionById(parts[1])
      const option = question?.answerOptions?.getById(parts[3])
      return `Answer Option Image (${question?.code || parts[1]} → ${option?.code || parts[3]})`
    }
    if (parts[0] === 'groups') {
      const group = survey?.sections.groups().getById(parts[1])
      return `Question Group (${group?.code || parts[1]})`
    }
    if (parts[0] === 'questions') {
      const question = survey?.elements.getQuestionById(parts[1])
      return `Question (${question?.code || parts[1]})`
    }
    return path
  }

  return (
    <>
      <PublishButton
        isPublished={isPublished}
        hasUnpublishedChanges={hasPendingSaves || hasUnpublishedChanges}
        disabled={isLoading || isSettingsSaving || hasPendingSaves}
        onClick={handleOpenModal}
      />
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex gap-2">
              <Globe className="h-4 w-4" />{' '}
              {isPublished ? 'Re-publish Survey' : 'Publish Survey'}
            </DialogTitle>
            <DialogDescription>
              {isPublished
                ? 'Review your changes and re-publish the live survey.'
                : 'Configure and publish your survey to make it available to participants.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="py-4">
            {validationErrors && !validationErrors.isValid && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Cannot Publish Survey</AlertTitle>
                <AlertDescription>
                  <div className="mt-2">
                    Please fix the following issues before publishing:
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      {Object.entries(validationErrors.errors).flatMap(
                        ([path, messages]) =>
                          messages.map((message, i) => (
                            <li key={`${path}-${i}`}>
                              <strong>{formatErrorPath(path)}:</strong>{' '}
                              {message}
                            </li>
                          )),
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {publishError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Publish Failed</AlertTitle>
                <AlertDescription>{publishError}</AlertDescription>
              </Alert>
            )}
            <PublishView
              survey={survey}
              defaults={defaults}
              handlers={handlers}
              label={label}
              notes={notes}
              onLabelChange={setLabel}
              onNotesChange={setNotes}
              comparison={comparison}
              isLoadingComparison={isCheckingComparison}
              isComparingWithPublished={isComparingWithPublished}
              hasComparisonSnapshot={!!comparisonSnapshotId}
              isPublished={isPublished}
              publication={publication}
              snapshot={snapshot}
              incompatibleConfirmed={incompatibleConfirmed}
              onIncompatibleConfirmChange={setIncompatibleConfirmed}
            />
          </DialogBody>
          <DialogFooter>
            <PublishFooter
              isPublished={isPublished}
              onCancel={handleCloseModal}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              isSettingsSaving={isSettingsSaving}
              isPublishPending={isPublishPending || isValidating}
              isUnpublishPending={isUnpublishPending}
              comparison={comparison}
              isLoadingComparison={isCheckingComparison}
              isComparingWithPublished={isComparingWithPublished}
              incompatibleConfirmed={incompatibleConfirmed}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
