import { useState, useRef, useEffect, useCallback } from 'react'
import { useProjectEmailTemplates } from 'appAdmin/component/SurveySettingShared'

export const useEmailTemplateManagement = () => {
  // Load project email templates (including system templates for defaults)
  const {
    templates: emailTemplates,
    systemTemplates,
    updateTemplate: updateEmailTemplate,
    deleteTemplate: deleteEmailTemplate,
    createTemplate: createEmailTemplate,
  } = useProjectEmailTemplates()

  // Track dirty email templates (templates that have been modified but not saved)
  const [dirtyTemplates, setDirtyTemplates] = useState<Set<string>>(new Set())
  // Track templates that should be deleted (reverted to system defaults)
  const [deletedTemplates, setDeletedTemplates] = useState<Set<string>>(
    new Set(),
  )
  const serverTemplatesRef = useRef(emailTemplates)

  // Update server reference when templates are loaded/refreshed
  useEffect(() => {
    if (
      emailTemplates &&
      emailTemplates.size > 0 &&
      dirtyTemplates.size === 0
    ) {
      serverTemplatesRef.current = emailTemplates
    }
  }, [emailTemplates, dirtyTemplates.size])

  // Track if we're in the middle of initializing a template (to handle batched updates)
  const initializingTemplateRef = useRef<string | null>(null)
  // Track templates currently being deleted to avoid duplicate deletions
  const deletingTemplatesRef = useRef<Set<string>>(new Set())

  // Handler for email template changes (local state only, no immediate API call)
  const handleEmailTemplateChange = useCallback(
    (
      type: string,
      lang: string,
      field: 'subject' | 'body',
      value: string | null,
    ) => {
      const key = `${type}-${lang}`

      // Handle reverting to system default (both subject and body will be set to null)
      if (value === null) {
        // Skip if already deleting this template
        if (deletingTemplatesRef.current.has(key)) {
          return
        }

        // Check if this is a "use default" action (both fields being set to null)
        // We need to track which templates should be deleted
        const currentTemplate = emailTemplates.get(key)
        if (currentTemplate) {
          // Mark as deleting to prevent duplicate deletions
          deletingTemplatesRef.current.add(key)

          // Remove from local state immediately so checkbox updates
          deleteEmailTemplate(type, lang)
          // Mark for deletion (revert to system default)
          setDeletedTemplates((prev) => new Set(prev).add(key))
          // Remove from dirty templates since deletion is a separate action
          setDirtyTemplates((prev) => {
            const newSet = new Set(prev)
            newSet.delete(key)
            return newSet
          })

          // Clear the deleting flag after a brief delay
          setTimeout(() => {
            deletingTemplatesRef.current.delete(key)
          }, 100)
        }
        return
      }

      // Remove from deleting set when user starts editing (unchecking "use default")
      deletingTemplatesRef.current.delete(key)

      // Handle initialization when unchecking "use default"
      // When initializing a new template, we need to handle both fields
      const currentTemplate = emailTemplates.get(key)
      if (!currentTemplate && initializingTemplateRef.current !== key) {
        // Starting to initialize a new template
        initializingTemplateRef.current = key

        // Get the system template default values
        const systemTemplate = systemTemplates?.getByKey(key)
        const defaultSubject = systemTemplate?.subject || ''
        const defaultBody = systemTemplate?.body || ''

        // Create the template with both fields initialized
        const subject = field === 'subject' ? value : defaultSubject
        const body = field === 'body' ? value : defaultBody
        createEmailTemplate(type, lang, subject, body)

        // Clear the initialization flag after a brief delay
        setTimeout(() => {
          initializingTemplateRef.current = null
        }, 100)
      } else {
        // Update existing template
        updateEmailTemplate(type, lang, field, value)
      }

      // Remove from deleted templates if user starts editing again
      setDeletedTemplates((prev) => {
        if (prev.has(key)) {
          const newSet = new Set(prev)
          newSet.delete(key)
          return newSet
        }
        return prev
      })

      // Mark this template as dirty
      setDirtyTemplates((prev) => new Set(prev).add(key))
    },
    [
      updateEmailTemplate,
      deleteEmailTemplate,
      createEmailTemplate,
      emailTemplates,
      systemTemplates,
    ],
  )

  // Revert email template changes to server state
  const revertEmailTemplates = useCallback(() => {
    if (dirtyTemplates.size > 0) {
      // Reset to server state
      dirtyTemplates.forEach((key) => {
        const serverTemplate = serverTemplatesRef.current.get(key)
        if (serverTemplate) {
          const [type, lang] = key.split('-')
          updateEmailTemplate(
            type,
            lang,
            'subject',
            serverTemplate.subject || '',
          )
          updateEmailTemplate(type, lang, 'body', serverTemplate.body || '')
        }
      })
      setDirtyTemplates(new Set())
    }

    // Clear deleted templates
    setDeletedTemplates(new Set())
  }, [dirtyTemplates, updateEmailTemplate])

  // Clear dirty state after successful save
  const clearDirtyState = useCallback(() => {
    setDirtyTemplates(new Set())
    setDeletedTemplates(new Set())
    serverTemplatesRef.current = emailTemplates
  }, [emailTemplates])

  return {
    emailTemplates,
    systemTemplates,
    dirtyTemplates,
    deletedTemplates,
    handleEmailTemplateChange,
    revertEmailTemplates,
    clearDirtyState,
  }
}
