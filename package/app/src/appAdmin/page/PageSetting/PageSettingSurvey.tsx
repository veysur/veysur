import React from 'react'

import { NavbarBrandAdmin } from 'appAdmin/component/Navbar'
import { AdminFooter } from 'appAdmin/component/Layout'
import {
  SettingSurvey,
  SettingSurveyLoading,
  SettingSurveyHeader,
  useSettingSurvey,
  useSettingSurveyOperations,
  useEmailTemplateManagement,
  useSurveySettingsSaveOperations,
} from 'appAdmin/component/SettingSurvey'
import {
  useSettingsPageLogic,
  createSettingsHandlers,
} from 'appAdmin/hook/useSettingsPageLogic'
import { useUnifiedNavigationBlocker } from 'hook/useUnifiedNavigationBlocker'
import { usePageTitle } from 'hook'
import { useFlashMessageOnce } from 'component/FlashMessage'

export const PageSettingSurvey: React.FC = () => {
  usePageTitle('Settings - Survey', { suffix: 'Veysur Admin' })

  // Common routing and section logic
  const { section, handleSectionChange } = useSettingsPageLogic()

  const useSettingSurveyState = useSettingSurvey()
  const { settingSurvey, isLoading } = useSettingSurveyState

  const useSettingSurveyOperationsState = useSettingSurveyOperations({
    useSettingSurveyState,
  })
  const { operations, save, cancel, isDirty, isSaving, saveError, isSuccess } =
    useSettingSurveyOperationsState

  // Email template management
  const {
    emailTemplates,
    systemTemplates,
    dirtyTemplates,
    deletedTemplates,
    handleEmailTemplateChange,
    revertEmailTemplates,
    clearDirtyState,
  } = useEmailTemplateManagement()

  // Create handlers using the factory function
  const {
    handleBooleanChange,
    handleStringChange,
    handleNumberChange,
    handleL10nChange,
    handleLanguageOptionsChange,
    handleStringListChange,
  } = createSettingsHandlers({
    updateLanguageProperty: (field, value) =>
      operations?.updateSettingSurveyLanguageProperty(field, value),
    updatePresentationProperty: (field, value) =>
      operations?.updateSettingSurveyPresentationProperty(field, value),
    updateParticipantProperty: (field, value) =>
      operations?.updateSettingSurveyParticipantProperty(field, value),
    updateDataProperty: (field, value) =>
      operations?.updateSettingSurveyDataProperty(field, value),
    updateAccessProperty: (field, value) =>
      operations?.updateSettingSurveyAccessProperty(field, value),
    updateDataPolicyProperty: (field, value) =>
      operations?.updateSettingSurveyDataPolicyProperty(field, value),
    updateLegalNoticeProperty: (field, value) =>
      operations?.updateSettingSurveyLegalNoticeProperty(field, value),
    updateNotifyProperty: (field, value) =>
      operations?.updateSettingSurveyNotifyProperty(field, value),
    updateScheduleProperty: (field, value) =>
      operations?.updateSettingSurveyScheduleProperty(field, value),
    updateContentFormatProperty: (field, value) =>
      operations?.updateSettingSurveyContentFormatProperty(field, value),
    updateDataPolicyText: (value, language) =>
      operations?.updateSettingSurveyDataPolicyText(value || '', language),
    updateLegalNoticeText: (value, language) =>
      operations?.updateSettingSurveyLegalNoticeText(value || '', language),
    updateDataPolicyUrl: (value, language) =>
      operations?.updateSettingSurveyDataPolicyUrl(value || '', language),
    updateLegalNoticeUrl: (value, language) =>
      operations?.updateSettingSurveyLegalNoticeUrl(value || '', language),
    updateLanguageOptions: (selectedLanguages) =>
      operations?.updateSettingSurveyLanguageProperty(
        'options',
        selectedLanguages,
      ),
  })

  // Save/cancel operations combining settings and email templates
  const { handleSave, handleCancel, isAnythingDirty } =
    useSurveySettingsSaveOperations({
      save,
      cancel,
      isDirty,
      dirtyTemplates,
      deletedTemplates,
      emailTemplates,
      operations,
      revertEmailTemplates,
      clearDirtyState,
    })

  // Show flash message once when save succeeds
  useFlashMessageOnce(isSuccess, 'success', 'Settings saved successfully')

  // Block navigation when there are unsaved changes
  const navigationBlockerDialog = useUnifiedNavigationBlocker(
    [
      {
        condition: isAnythingDirty,
        message: 'You have unsaved changes to survey settings.',
      },
    ],
    {
      title: 'Unsaved Changes',
      description:
        'You have unsaved changes to survey settings. Are you sure you want to leave without saving?',
      confirmLabel: 'Leave Without Saving',
      cancelLabel: 'Keep Editing',
      onSaveAndContinue: handleSave,
      saveAndContinueLabel: 'Save & Continue',
    },
  )

  // Get available languages from settingSurvey
  const availableLanguages = settingSurvey?.language?.options || ['en']
  const defaultLanguage = settingSurvey?.language?.default || 'en'

  const headerContent = (
    <SettingSurveyHeader
      isAnythingDirty={isAnythingDirty}
      isSaving={isSaving}
      isLoading={isLoading}
      saveError={saveError}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )

  return (
    <>
      <NavbarBrandAdmin />
      <div className="h-[calc(100vh-120px)]">
        {isLoading || !settingSurvey ? (
          <SettingSurveyLoading header={headerContent} />
        ) : (
          <SettingSurvey
            settingSurvey={settingSurvey}
            activeSection={section}
            onSectionChange={handleSectionChange}
            handleBooleanChange={handleBooleanChange}
            handleStringChange={handleStringChange}
            handleNumberChange={handleNumberChange}
            handleL10nChange={handleL10nChange}
            handleLanguageOptionsChange={handleLanguageOptionsChange}
            handleStringListChange={handleStringListChange}
            emailTemplateProps={{
              emailTemplates,
              systemTemplates,
              availableLanguages,
              defaultLanguage,
              onEmailTemplateChange: handleEmailTemplateChange,
            }}
            header={headerContent}
          />
        )}
      </div>
      <AdminFooter />
      {navigationBlockerDialog}
    </>
  )
}

export default PageSettingSurvey
