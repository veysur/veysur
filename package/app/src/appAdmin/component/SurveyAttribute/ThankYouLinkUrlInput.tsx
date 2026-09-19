// cspell:ignore unsets
import { useState } from 'react'
import { X } from 'lucide-react'

import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from 'component/shadcn/alert-dialog'
import { Button } from 'component/shadcn/button'

import { TextInput } from './TextInput'
import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'

/**
 * The End URL field for a single language, plus a "Clear All Languages"
 * action. Per-language clearing can't fully disable the thank you link
 * button when other languages still have a value set (that value is used
 * as a fallback) — this gives admins a single action that unsets the URL
 * and link text for every language at once.
 */
export const ThankYouLinkUrlInput: AttributeConfig['component'] = function (
  props,
) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const operations = useSurveyEditorStore((state) => state.operations)
  const { entity } = props

  const link =
    entity && 'thankYouSection' in entity
      ? entity.thankYouSection?.config?.link
      : undefined
  const hasAnyValue =
    !!link &&
    (Object.values(link.url || {}).some((value) => value) ||
      Object.values(link.text || {}).some((value) => value))

  const handleConfirm = () => {
    operations?.clearSurveyThankYouLink()
    setConfirmOpen(false)
  }

  return (
    <div>
      <TextInput {...props} />
      {hasAnyValue && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground -mt-3 mb-4"
            >
              <X className="mr-1 h-3 w-3" />
              Clear All Languages
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear End URL</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the End URL and Link text for every language, not
                just the language currently being edited. The End URL button
                will no longer be shown on the thank you page. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Clear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
