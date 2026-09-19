import { render, screen, fireEvent } from '@testing-library/react'
import { EmailTemplate, EmailTemplateCollection } from 'veysur-common'

import { DefaultableEmailTemplateSettings } from './DefaultableEmailTemplateSettings'

jest.mock('appAdmin/component/ContentEditor', () => ({
  ContentEditor: ({
    value,
    onChange,
    placeholder,
    disabled,
  }: {
    value?: string
    onChange?: (content: string) => void
    placeholder?: string
    disabled?: boolean
  }) => (
    <textarea
      data-testid="body-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  ),
}))

jest.mock('component/LanguageSelector', () => ({
  LanguageSelector: ({
    langEditing,
    onLanguageChange,
    availableLanguages,
  }: {
    langEditing: string
    onLanguageChange: (lang: string) => void
    availableLanguages: string[]
  }) => (
    <select
      data-testid="language-selector"
      value={langEditing}
      onChange={(e) => onLanguageChange(e.target.value)}
    >
      {availableLanguages.map((lang) => (
        <option key={lang} value={lang}>
          {lang}
        </option>
      ))}
    </select>
  ),
}))

describe('DefaultableEmailTemplateSettings', () => {
  const systemTemplates = EmailTemplateCollection.fromArray([
    new EmailTemplate({
      type: 'invite',
      lang: 'en',
      subject: 'English subject',
      body: '<p>English body</p>',
    }),
  ])

  const projectTemplates = new EmailTemplateCollection()

  it('falls back to the English default body when the selected language has no translation', () => {
    render(
      <DefaultableEmailTemplateSettings
        surveyTemplates={new Map()}
        projectTemplates={projectTemplates}
        systemTemplates={systemTemplates}
        availableLanguages={['en', 'zh']}
        defaultLanguage="en"
        onTemplateChange={jest.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('language-selector'), {
      target: { value: 'zh' },
    })

    expect(screen.getByTestId('body-editor')).toHaveValue('<p>English body</p>')
  })
})
