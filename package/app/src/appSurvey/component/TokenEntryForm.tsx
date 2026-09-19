import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Alert, AlertTitle, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { FieldError } from 'component/Form'
import { SurveyPageContainer } from 'component/Survey'

interface TokenEntryFormProps {
  surveyId: string
  error?: string
}

export const TokenEntryForm: React.FC<TokenEntryFormProps> = ({
  surveyId,
  error,
}) => {
  const { t } = useTranslation('app-survey')
  const [tokenInput, setTokenInput] = useState('')
  const [validationError, setValidationError] = useState<string>()
  const navigate = useNavigate()

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Inline validation
    const trimmedToken = tokenInput.trim()
    if (!trimmedToken) {
      setValidationError(t('registration.accessToken.required'))
      return
    }

    // Clear validation error and navigate
    setValidationError(undefined)
    navigate(`/${surveyId}/${trimmedToken}`)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTokenInput(e.target.value)
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(undefined)
    }
  }

  return (
    <SurveyPageContainer>
      {/* Show error message if token was invalid */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>{t('registration.invalidTokenTitle')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="bg-card rounded-lg shadow-lg border p-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          {t('registration.accessTokenRequired.title')}
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          {t('registration.accessTokenRequired.body')}
        </p>

        <form onSubmit={handleTokenSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">{t('registration.accessToken.label')}</Label>
            <Input
              id="token"
              type="text"
              value={tokenInput}
              onChange={handleInputChange}
              placeholder={t('registration.accessToken.placeholder')}
              autoFocus
              aria-invalid={!!validationError}
              className="text-base"
            />
            {validationError && <FieldError>{validationError}</FieldError>}
          </div>

          <Button type="submit" className="w-full" size="lg">
            {t('registration.submit')}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground">
            {t('registration.contactAdmin')}
          </p>
        </div>
      </div>
    </SurveyPageContainer>
  )
}
