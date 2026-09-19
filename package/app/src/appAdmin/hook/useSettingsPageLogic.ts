import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { settingsConfig } from 'appAdmin/component/SurveySettingShared'

/**
 * Common logic for settings pages with routable sections
 * Handles URL params, navigation, and section validation
 */
export const useSettingsPageLogic = () => {
  const { section = 'language' } = useParams<{ section: string }>()
  const navigate = useNavigate()

  // Validate section exists in config
  const validSection = settingsConfig.find((s) => s.key === section)

  useEffect(() => {
    if (section && !validSection) {
      // Invalid section - redirect to language
      navigate('language', { replace: true })
    }
  }, [section, validSection, navigate])

  const handleSectionChange = (newSection: string) => {
    // Navigate to sibling route by going up one level first
    navigate(`../${newSection}`, { relative: 'path' })
  }

  return {
    section: section || 'language',
    handleSectionChange,
  }
}

/**
 * Type definitions for operation callbacks
 */
export type SettingOperations = {
  updateLanguageProperty?: (field: string, value: unknown) => void
  updatePresentationProperty?: (field: string, value: unknown) => void
  updateParticipantProperty?: (field: string, value: unknown) => void
  updateDataProperty?: (field: string, value: unknown) => void
  updateAccessProperty?: (field: string, value: unknown) => void
  updateDataPolicyProperty?: (field: string, value: unknown) => void
  updateLegalNoticeProperty?: (field: string, value: unknown) => void
  updateNotifyProperty?: (field: string, value: unknown) => void
  updateScheduleProperty?: (field: string, value: unknown) => void
  updateContentFormatProperty?: (field: string, value: unknown) => void
  updateDataPolicyText?: (value: string | null, language?: string) => void
  updateLegalNoticeText?: (value: string | null, language?: string) => void
  updateLanguageOptions?: (selectedLanguages: string[]) => void
}

/**
 * Creates handler functions for settings changes
 * Uses a map of operations to call the appropriate update function
 */
export const createSettingsHandlers = (operations: SettingOperations) => {
  const handleBooleanChange = (
    section: string,
    field: string,
    value: string | null,
  ) => {
    const boolValue = value === null ? null : value === 'Yes'
    switch (section) {
      case 'presentation':
        operations.updatePresentationProperty?.(field, boolValue)
        break
      case 'participant':
        operations.updateParticipantProperty?.(field, boolValue)
        break
      case 'data':
        operations.updateDataProperty?.(field, boolValue)
        break
      case 'access':
        operations.updateAccessProperty?.(field, boolValue)
        break
      case 'dataPolicy':
        operations.updateDataPolicyProperty?.(field, boolValue)
        break
      case 'legalNotice':
        operations.updateLegalNoticeProperty?.(field, boolValue)
        break
      case 'contentFormat':
        operations.updateContentFormatProperty?.(field, boolValue)
        break
    }
  }

  const handleStringChange = (
    section: string,
    field: string,
    value: string | null,
  ) => {
    switch (section) {
      case 'language':
        operations.updateLanguageProperty?.(field, value)
        break
      case 'presentation':
        operations.updatePresentationProperty?.(field, value)
        break
      case 'notify':
        operations.updateNotifyProperty?.(field, value)
        break
      case 'schedule':
        operations.updateScheduleProperty?.(field, value)
        break
    }
  }

  const handleNumberChange = (
    section: string,
    field: string,
    value: string | null,
  ) => {
    const parsed = value === null || value === '' ? null : parseInt(value)
    const numValue = parsed !== null && Number.isNaN(parsed) ? null : parsed
    switch (section) {
      case 'presentation':
        operations.updatePresentationProperty?.(field, numValue)
        break
      case 'participant':
        operations.updateParticipantProperty?.(field, numValue)
        break
    }
  }

  const handleL10nChange = (
    section: string,
    _field: string,
    value: string | null,
    language?: string,
  ) => {
    switch (section) {
      case 'dataPolicy':
        operations.updateDataPolicyText?.(value, language)
        break
      case 'legalNotice':
        operations.updateLegalNoticeText?.(value, language)
        break
    }
  }

  const handleLanguageOptionsChange = (selectedLanguages: string[]) => {
    operations.updateLanguageOptions?.(selectedLanguages)
  }

  return {
    handleBooleanChange,
    handleStringChange,
    handleNumberChange,
    handleL10nChange,
    handleLanguageOptionsChange,
  }
}
