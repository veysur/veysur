import { useState, useCallback, useMemo } from 'react'
import {
  EmailTemplate,
  EmailTemplateCollection,
  EmailTemplateCollectionComposite,
} from 'veysur-common'

import { Card, CardHeader, CardContent } from 'component/shadcn/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'component/shadcn/tabs'
import { Label } from 'component/shadcn/label'
import { Input } from 'component/shadcn/input'
import { LanguageSelector } from 'component/LanguageSelector'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import { DefaultableWrapper } from 'appAdmin/component/SurveySettingShared/DefaultableWrapper'
import { VariablePicker } from 'appAdmin/component/VariablePicker/VariablePicker'
import {
  EMAIL_VARIABLE_GROUPS,
  emailTypes,
  appendVariableToken,
} from 'appAdmin/component/SurveySettingShared/emailTemplateVariables'

type Props = {
  surveyTemplates: Map<string, EmailTemplate>
  projectTemplates: EmailTemplateCollection
  systemTemplates?: EmailTemplateCollection
  availableLanguages: string[]
  defaultLanguage: string
  onTemplateChange: (
    type: string,
    lang: string,
    field: 'subject' | 'body',
    value: string | null,
  ) => void
  isLoading?: boolean
}

export function DefaultableEmailTemplateSettings({
  surveyTemplates,
  projectTemplates,
  systemTemplates,
  availableLanguages,
  defaultLanguage,
  onTemplateChange,
  isLoading = false,
}: Props) {
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage)

  const templateComposite = useMemo(
    () =>
      new EmailTemplateCollectionComposite({
        systemTemplates: systemTemplates ?? new EmailTemplateCollection(),
        projectTemplates,
        surveyTemplates: EmailTemplateCollection.fromMap(surveyTemplates),
        projectDefaultLang: defaultLanguage,
      }),
    [systemTemplates, projectTemplates, surveyTemplates, defaultLanguage],
  )

  const getTemplate = (
    type: string,
    lang: string,
  ): {
    current: EmailTemplate | null
    default: EmailTemplate | null
  } => {
    const key = `${type}-${lang}`
    return {
      current: surveyTemplates.get(key) || null,
      default: templateComposite.getDefaultTemplate({
        type,
        lang,
        context: 'survey',
      }),
    }
  }

  const handleFieldChange = useCallback(
    (type: string, field: 'subject' | 'body', value: string | null) => {
      onTemplateChange(type, selectedLanguage, field, value)
    },
    [selectedLanguage, onTemplateChange],
  )

  if (isLoading) {
    return (
      <Card className="max-w-3xl">
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <span>📧</span>
            <span className="font-semibold">Email Templates</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading email templates...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📧</span>
            <span className="font-semibold">Email Templates</span>
          </div>
          <LanguageSelector
            availableLanguages={availableLanguages}
            langEditing={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="invite">
          <TabsList className="grid w-full grid-cols-6 mb-3">
            {emailTypes.map((emailType) => (
              <TabsTrigger key={emailType.key} value={emailType.key}>
                {emailType.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {emailTypes.map((emailType) => {
            const { current, default: defaultTemplate } = getTemplate(
              emailType.key,
              selectedLanguage,
            )

            const templateKey = `${emailType.key}-${selectedLanguage}`

            // If template exists in surveyTemplates, it's NOT using defaults
            // If it doesn't exist, it IS using defaults (falls back to projectTemplates)
            const isUsingDefault = !surveyTemplates.has(templateKey)

            const handleUseDefaultChange = (useDefault: boolean) => {
              if (useDefault) {
                // Delete the survey-specific template to revert to defaults
                handleFieldChange(emailType.key, 'subject', null)
                handleFieldChange(emailType.key, 'body', null)
              } else {
                // Create a survey-specific template with default values
                const newSubject = defaultTemplate?.subject || ''
                const newBody = defaultTemplate?.body || ''

                handleFieldChange(emailType.key, 'subject', newSubject)
                handleFieldChange(emailType.key, 'body', newBody)
              }
            }

            // Determine displayed values
            // When using default (optimistically or actually), show default values and disable inputs
            const subjectValue = isUsingDefault
              ? (defaultTemplate?.subject ?? '')
              : (current?.subject ?? defaultTemplate?.subject ?? '')
            const bodyValue = isUsingDefault
              ? (defaultTemplate?.body ?? '')
              : (current?.body ?? defaultTemplate?.body ?? '')
            const isSubjectDisabled = isUsingDefault
            const isBodyDisabled = isUsingDefault

            return (
              <TabsContent
                key={emailType.key}
                value={emailType.key}
                className="mt-3"
              >
                <DefaultableWrapper
                  isUsingDefault={isUsingDefault}
                  onUseDefaultChange={handleUseDefaultChange}
                  className="space-y-4"
                >
                  <div>
                    <Label>Subject</Label>
                    <div className="flex items-start gap-2">
                      <Input
                        value={subjectValue}
                        onChange={(e) =>
                          handleFieldChange(
                            emailType.key,
                            'subject',
                            e.target.value,
                          )
                        }
                        disabled={isSubjectDisabled}
                        placeholder={
                          isSubjectDisabled
                            ? `${defaultTemplate?.subject || 'No default set'}`
                            : 'Type your subject here'
                        }
                        className="flex-1"
                      />
                      <VariablePicker
                        groups={EMAIL_VARIABLE_GROUPS}
                        disabled={isSubjectDisabled}
                        onSelect={(path) =>
                          handleFieldChange(
                            emailType.key,
                            'subject',
                            appendVariableToken(subjectValue, path),
                          )
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Subject line for the {emailType.label.toLowerCase()} email
                    </p>
                  </div>
                  <div>
                    <Label>Body</Label>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <ContentEditor
                          value={bodyValue}
                          onChange={(value) =>
                            handleFieldChange(emailType.key, 'body', value)
                          }
                          disabled={isBodyDisabled}
                          placeholder={
                            isBodyDisabled
                              ? `${defaultTemplate?.body || 'No default set'}`
                              : 'Type your body here'
                          }
                          withToolbar={true}
                          toolbarExtra={true}
                          emailPreview={true}
                        />
                      </div>
                      <VariablePicker
                        groups={EMAIL_VARIABLE_GROUPS}
                        disabled={isBodyDisabled}
                        onSelect={(path) =>
                          handleFieldChange(
                            emailType.key,
                            'body',
                            appendVariableToken(bodyValue, path),
                          )
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Email body content. HTML is supported.
                    </p>
                  </div>
                </DefaultableWrapper>
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}
