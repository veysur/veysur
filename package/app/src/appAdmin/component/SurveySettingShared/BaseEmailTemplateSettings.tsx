import { useState } from 'react'
import { EmailTemplate } from 'veysur-common'

import { Card, CardHeader, CardContent } from 'component/shadcn/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'component/shadcn/tabs'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { LanguageSelector } from 'component/LanguageSelector'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import { VariablePicker } from 'appAdmin/component/VariablePicker/VariablePicker'
import {
  EMAIL_VARIABLE_GROUPS,
  emailTypes,
  appendVariableToken,
} from 'appAdmin/component/SurveySettingShared/emailTemplateVariables'

type Props = {
  templates: Map<string, EmailTemplate>
  availableLanguages: string[]
  defaultLanguage: string
  onTemplateChange: (
    type: string,
    lang: string,
    field: 'subject' | 'body',
    value: string,
  ) => void
}

export function BaseEmailTemplateSettings({
  templates,
  availableLanguages,
  defaultLanguage,
  onTemplateChange,
}: Props) {
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage)

  const getTemplate = (type: string, lang: string): EmailTemplate | null => {
    const key = `${type}-${lang}`
    return templates.get(key) || null
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
            const template = getTemplate(emailType.key, selectedLanguage)

            return (
              <TabsContent
                key={emailType.key}
                value={emailType.key}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor={`${emailType.key}-subject`}>Subject</Label>
                  <div className="flex items-start gap-2 mt-1">
                    <Input
                      id={`${emailType.key}-subject`}
                      name="email-template-subject"
                      value={template?.subject || ''}
                      onChange={(e) =>
                        onTemplateChange(
                          emailType.key,
                          selectedLanguage,
                          'subject',
                          e.target.value,
                        )
                      }
                      placeholder="Type your subject here"
                      className="flex-1"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                    />
                    <VariablePicker
                      groups={EMAIL_VARIABLE_GROUPS}
                      onSelect={(path) =>
                        onTemplateChange(
                          emailType.key,
                          selectedLanguage,
                          'subject',
                          appendVariableToken(template?.subject || '', path),
                        )
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Subject line for the {emailType.label.toLowerCase()} email
                  </p>
                </div>
                <div>
                  <Label htmlFor={`${emailType.key}-body`}>Body</Label>
                  <div className="mt-1 flex items-start gap-2">
                    <div className="flex-1">
                      <ContentEditor
                        value={template?.body || ''}
                        onChange={(value) =>
                          onTemplateChange(
                            emailType.key,
                            selectedLanguage,
                            'body',
                            value,
                          )
                        }
                        placeholder="Type your body here"
                        withToolbar={true}
                        toolbarExtra={true}
                        emailPreview={true}
                        className="bg-white dark:bg-white text-stone-900 dark:text-stone-900"
                      />
                    </div>
                    <VariablePicker
                      groups={EMAIL_VARIABLE_GROUPS}
                      onSelect={(path) =>
                        onTemplateChange(
                          emailType.key,
                          selectedLanguage,
                          'body',
                          appendVariableToken(template?.body || '', path),
                        )
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Email body content. HTML is supported.
                  </p>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}
