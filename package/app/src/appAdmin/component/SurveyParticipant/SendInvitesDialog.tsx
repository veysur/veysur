import React, { useState } from 'react'
import { CheckCircle, AlertCircle, Mail } from 'lucide-react'
import { useFlashMessage } from 'component/FlashMessage'
import { PlanGateAlert } from 'component/PlanGateAlert'
import { SurveyNotPublishedAlert } from 'component/SurveyNotPublishedAlert'
import { useFeatureGate } from 'appAdmin/hook'
import { usePublished } from 'appAdmin/component/SurveyEditorPublish'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'component/shadcn/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'component/shadcn/alert-dialog'
import { Button } from 'component/shadcn/button'
import { Progress } from 'component/shadcn/progress'
import { Alert, AlertDescription } from 'component/shadcn/alert'

import { useSurveyParticipantSendEmail, SendEmailProgressData } from './hook'

type EmailType = 'invite' | 'reminder'

const EMAIL_CONFIG: Record<
  EmailType,
  {
    dialogTitle: string
    confirmMessage: string
    sendingTitle: string
    buttonLabel: string
    successMessage: (count: number) => string
    completeTitle: (hasErrors: boolean) => string
    queuedLabel: string
  }
> = {
  invite: {
    dialogTitle: 'Send Invites',
    confirmMessage:
      "Send invitation emails to all participants who haven't received one yet?",
    sendingTitle: 'Queuing Invites...',
    buttonLabel: 'Send Invites',
    successMessage: (count: number) =>
      `Successfully queued ${count} invitation${count !== 1 ? 's' : ''} for sending`,
    completeTitle: (hasErrors: boolean) =>
      hasErrors ? 'Invites Queued with Errors' : 'Invites Queued for Sending!',
    queuedLabel: 'invites',
  },
  reminder: {
    dialogTitle: 'Send Reminders',
    confirmMessage:
      "Send reminder emails to all participants who have been invited but haven't received a reminder yet?",
    sendingTitle: 'Queuing Reminders...',
    buttonLabel: 'Send Reminders',
    successMessage: (count: number) =>
      `Successfully queued ${count} reminder${count !== 1 ? 's' : ''} for sending`,
    completeTitle: (hasErrors: boolean) =>
      hasErrors
        ? 'Reminders Queued with Errors'
        : 'Reminders Queued for Sending!',
    queuedLabel: 'reminders',
  },
}

type SendEmailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  surveyId: string
  emailType: EmailType
}

type SendState = {
  status: 'confirm' | 'sending' | 'complete'
  queued: number
  errors: number
  total: number
  errorList: Array<{ email: string; message: string }>
}

export const SendEmailDialog: React.FC<SendEmailDialogProps> = ({
  open,
  onOpenChange,
  surveyId,
  emailType,
}) => {
  const config = EMAIL_CONFIG[emailType]
  const { sendEmail } = useSurveyParticipantSendEmail(surveyId, emailType)
  const { canUse } = useFeatureGate()
  const canEmailInvite = canUse('EMAIL_INVITE')
  const { isPublished } = usePublished({ surveyId })
  const canSend = canEmailInvite && isPublished
  const { showFlashMessage } = useFlashMessage()
  // The parent remounts this component via `key={open}` on open/close, so
  // this initial state only needs to be set once per mount rather than
  // reset in an effect keyed on `open`.
  const [sendState, setSendState] = useState<SendState>({
    status: 'confirm',
    queued: 0,
    errors: 0,
    total: 0,
    errorList: [],
  })

  const handleConfirm = async () => {
    setSendState({
      status: 'sending',
      queued: 0,
      errors: 0,
      total: 0,
      errorList: [],
    })

    try {
      await sendEmail({
        onProgress: (data: SendEmailProgressData) => {
          if (data.type === 'progress') {
            setSendState((prev) => ({
              ...prev,
              queued: data.queued,
              errors: data.errors,
              total: data.total || prev.total,
              errorList: data.batchErrors
                ? [...prev.errorList, ...data.batchErrors]
                : prev.errorList,
            }))
          } else if (data.type === 'complete') {
            // If no errors, show success toast and close dialog
            if (data.errors === 0) {
              showFlashMessage('success', config.successMessage(data.queued))
              onOpenChange(false)
            } else {
              // If errors, keep dialog open to show details
              setSendState((prev) => ({
                status: 'complete',
                queued: data.queued,
                errors: data.errors,
                total: data.total || prev.total,
                errorList: prev.errorList,
              }))
            }
          }
        },
      })
    } catch (error) {
      console.error('Failed to send invites:', error)
      setSendState((prev) => ({
        ...prev,
        status: 'complete',
      }))
    }
  }

  const handleClose = () => {
    if (sendState.status !== 'sending') {
      onOpenChange(false)
    }
  }

  const progress =
    sendState.total > 0
      ? ((sendState.queued + sendState.errors) / sendState.total) * 100
      : 0

  if (sendState.status === 'confirm') {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{config.dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {config.confirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!canEmailInvite && (
            <PlanGateAlert
              message="Email invitations require a Pro plan or higher."
              className="mt-2"
            />
          )}
          {!isPublished && (
            <SurveyNotPublishedAlert surveyId={surveyId} className="mt-2" />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {canSend && (
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  handleConfirm()
                }}
              >
                {config.buttonLabel}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  if (sendState.status === 'sending') {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config.sendingTitle}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="mb-4">
              <Mail className="h-12 w-12 mx-auto text-primary animate-pulse" />
            </div>
            <div className="mb-4">
              <p className="text-lg font-semibold">{sendState.queued} queued</p>
              {sendState.errors > 0 && (
                <p className="text-sm text-destructive">
                  {sendState.errors} errors
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {sendState.queued + sendState.errors} of {sendState.total}
              </p>
            </div>
            <Progress value={progress} className="mb-4" />
            <p className="text-muted-foreground text-sm">
              Processing in batches of 100...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {config.completeTitle(sendState.errors > 0)}
          </DialogTitle>
        </DialogHeader>
        <div className="text-center py-8">
          <div className="flex justify-center mb-4">
            {sendState.errors === 0 ? (
              <CheckCircle className="h-16 w-16 text-success" />
            ) : (
              <AlertCircle className="h-16 w-16 text-warning" />
            )}
          </div>

          <div className="mb-4">
            <p className="text-lg">
              {sendState.queued} {config.queuedLabel} queued for sending
            </p>
            {sendState.errors > 0 && (
              <p className="text-sm text-destructive">
                {sendState.errors} failed to queue
              </p>
            )}
          </div>

          {sendState.errorList.length > 0 && (
            <Alert variant="destructive" className="mb-4 text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Errors:</strong>
                <ul className="mt-2 list-disc list-inside max-h-40 overflow-y-auto">
                  {sendState.errorList.slice(0, 20).map((error, idx) => (
                    <li key={idx} className="text-sm">
                      {error.email}: {error.message}
                    </li>
                  ))}
                  {sendState.errorList.length > 20 && (
                    <li className="text-sm">
                      ...and {sendState.errorList.length - 20} more
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Convenience components for backward compatibility and cleaner usage
export const SendInvitesDialog: React.FC<
  Omit<SendEmailDialogProps, 'emailType'>
> = (props) => {
  return <SendEmailDialog {...props} emailType="invite" />
}

export const SendRemindersDialog: React.FC<
  Omit<SendEmailDialogProps, 'emailType'>
> = (props) => {
  return <SendEmailDialog {...props} emailType="reminder" />
}
