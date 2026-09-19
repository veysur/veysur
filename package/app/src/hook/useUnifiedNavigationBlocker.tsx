import React, { useEffect, useCallback, useRef, useState } from 'react'
import {
  useBeforeUnload,
  useBlocker,
  Blocker,
  BlockerFunction,
} from 'react-router-dom'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'component/shadcn/alert-dialog'
import { Button, buttonVariants } from 'component/shadcn/button'

type BlockerCondition = {
  condition: boolean
  message: string
}

type UseUnifiedNavigationBlockerOptions = {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onSaveAndContinue?: () => Promise<void>
  saveAndContinueLabel?: string
}

export function useUnifiedNavigationBlocker(
  blockerConditions: BlockerCondition[],
  options: UseUnifiedNavigationBlockerOptions = {},
  allowedPathPattern?: RegExp,
): React.ReactElement | null {
  const {
    title = 'Unsaved Changes',
    description = 'You have unsaved changes. Are you sure you want to navigate away?',
    confirmLabel = 'Leave Page',
    cancelLabel = 'Stay',
    onSaveAndContinue,
    saveAndContinueLabel = 'Save & Continue',
  } = options
  const hasAnyBlocking = blockerConditions.some(({ condition }) => condition)
  const blockingMessages = blockerConditions
    .filter(({ condition }) => condition)
    .map(({ message }) => message)
    .join(' ')

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault()
    e.returnValue =
      blockingMessages || 'Your data is still saving. Please wait...'
    return e.returnValue
  }

  useBeforeUnload(hasAnyBlocking ? handleBeforeUnload : () => {})

  const [showDialog, setShowDialog] = useState(false)
  const [isSavingAndContinue, setIsSavingAndContinue] = useState(false)
  const blockerRef = useRef<Blocker | null>(null)

  const shouldBlock = useCallback<BlockerFunction>(
    ({ nextLocation, currentLocation }) => {
      if (!hasAnyBlocking) return false

      // If an allowed path pattern is provided, check if we're staying within it
      if (allowedPathPattern) {
        const currentPath = currentLocation.pathname
        const nextPath = nextLocation.pathname

        // Extract the base pattern from current path (e.g., /admin/survey/123)
        const currentMatch = currentPath.match(allowedPathPattern)
        const nextMatch = nextPath.match(allowedPathPattern)

        // If both paths match the same pattern, allow navigation
        if (currentMatch && nextMatch && currentMatch[0] === nextMatch[0]) {
          return false // Allow navigation within the same context
        }
      }

      return true // Block the navigation
    },
    [hasAnyBlocking, allowedPathPattern],
  )

  const blocker = useBlocker(shouldBlock)
  blockerRef.current = blocker

  // Show dialog when navigation is blocked
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowDialog(true)
    }
  }, [blocker.state])

  const handleConfirm = () => {
    setShowDialog(false)
    blocker.proceed?.()
  }

  const handleCancel = () => {
    setShowDialog(false)
    blocker.reset?.()
  }

  const handleSaveAndContinue = async () => {
    if (!onSaveAndContinue) return
    setIsSavingAndContinue(true)
    try {
      await onSaveAndContinue()
      setShowDialog(false)
      blocker.proceed?.()
    } catch {
      setShowDialog(false)
      blocker.reset?.()
    } finally {
      setIsSavingAndContinue(false)
    }
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelLabel}
          </AlertDialogCancel>
          {onSaveAndContinue && (
            <Button
              variant="default"
              disabled={isSavingAndContinue}
              onClick={handleSaveAndContinue}
            >
              {isSavingAndContinue ? 'Saving…' : saveAndContinueLabel}
            </Button>
          )}
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
