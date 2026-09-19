import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Mail } from 'lucide-react'

import { mzenResolver } from 'common/hookform/mzenResolver'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Separator } from 'component/shadcn/separator'
import { FieldError } from 'component/Form'
import { SurveyPageContainer } from 'component/Survey'
import { LanguageSelector } from 'component/LanguageSelector'

import i18next from '../i18n'
import { resolveUiLanguage } from '../common'
import { getAuthParticipantApi } from '../registry'
import { useSurveyParticipantAttributeSnapshot } from '../hook/useSurveyParticipantAttributeSnapshot'
import {
  buildRegistrationFormSchema,
  RegistrationFormData,
} from '../model/schema/SchemaRegistrationForm'
import { ErrorRest } from 'model'

interface RegistrationFormProps {
  surveyId: string
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  surveyId,
}) => {
  const { t } = useTranslation('app-survey')
  const [searchParams] = useSearchParams()
  const urlLanguage = searchParams.get('lang') || undefined
  const [language, setLanguage] = useState('')

  const {
    attributes,
    languageDefault,
    languageOptions,
    isLoading: isLoadingAttributes,
  } = useSurveyParticipantAttributeSnapshot(surveyId, language || undefined)

  const schema = useMemo(
    () => buildRegistrationFormSchema(attributes),
    [attributes],
  )

  const form = useForm<RegistrationFormData>({
    resolver: mzenResolver(schema),
    defaultValues: {
      nameFirst: '',
      nameLast: '',
      email: '',
      language: '',
      attributes: {},
    },
  })

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = form

  // Keep react-hook-form's internal value and the form's UI chrome language
  // synced with the selected language. Both are imperative calls into libraries
  // outside React's own state, so they belong in an effect rather than at
  // render time.
  useEffect(() => {
    if (!language) return
    setValue('language', language)
    i18next.changeLanguage(resolveUiLanguage(language, languageDefault))
  }, [language, languageDefault, setValue])

  // Choose the initial language once the attribute snapshot finishes loading.
  // Precedence: the `?lang=` URL param (carried over from the survey link the
  // participant followed), then the browser language, then the survey default.
  // Only options the survey actually supports are considered. Done at render
  // time (React's "adjusting state when a prop changes" pattern), gated on
  // isLoadingAttributes transitioning, instead of in an effect, avoiding an
  // extra render before the language appears.
  const [prevIsLoadingAttributes, setPrevIsLoadingAttributes] =
    useState(isLoadingAttributes)
  if (isLoadingAttributes !== prevIsLoadingAttributes) {
    setPrevIsLoadingAttributes(isLoadingAttributes)
    if (!isLoadingAttributes && languageDefault && !language) {
      const browserLang =
        navigator.language?.split('-')[0]?.toLowerCase() ?? 'en'
      const detected =
        urlLanguage && languageOptions.includes(urlLanguage)
          ? urlLanguage
          : languageOptions.includes(browserLang)
            ? browserLang
            : languageDefault
      setLanguage(detected)
    }
  }

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
  }

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      const authApi = getAuthParticipantApi()
      await authApi.register(surveyId, {
        nameFirst: data.nameFirst,
        nameLast: data.nameLast,
        email: data.email,
        language: data.language,
        attributes: data.attributes,
      })
    } catch (err) {
      const message =
        err instanceof ErrorRest
          ? err.ref === 'ERROR_DISPOSABLE_EMAIL_DOMAIN'
            ? t('registration.disposableEmailDomain')
            : err.message || t('registration.failed')
          : t('registration.failedRetry')
      setError('root', { message })
    }
  }

  if (isSubmitSuccessful) {
    return (
      <SurveyPageContainer>
        <div className="flex flex-col items-center text-center py-4">
          <CheckCircle2 className="h-14 w-14 text-green-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-3">
            {t('registration.successTitle')}
          </h2>
          <Separator className="mb-4 w-16" />
          <div className="flex items-start gap-2 text-muted-foreground max-w-sm">
            <Mail className="h-5 w-5 mt-0.5 shrink-0" />
            <p>{t('registration.successBody')}</p>
          </div>
        </div>
      </SurveyPageContainer>
    )
  }

  return (
    <SurveyPageContainer>
      <h2 className="text-center mb-4 text-2xl font-semibold">
        {t('registration.formTitle')}
      </h2>
      <p className="text-center mb-4">{t('registration.formIntro')}</p>

      {errors.root && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}

      {languageOptions.length > 1 && (
        <div className="flex justify-end mb-4">
          <LanguageSelector
            availableLanguages={languageOptions}
            langEditing={language || languageDefault}
            onLanguageChange={handleLanguageChange}
          />
        </div>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-3">
            <Label htmlFor="nameFirst">
              {t('registration.nameFirst.label')}
            </Label>
            <Input
              id="nameFirst"
              type="text"
              placeholder={t('registration.nameFirst.placeholder')}
              disabled={isSubmitting}
              {...register('nameFirst')}
            />
            {errors.nameFirst && (
              <FieldError className="mt-1">
                {errors.nameFirst.message}
              </FieldError>
            )}
          </div>
          <div className="mb-3">
            <Label htmlFor="nameLast">{t('registration.nameLast.label')}</Label>
            <Input
              id="nameLast"
              type="text"
              placeholder={t('registration.nameLast.placeholder')}
              disabled={isSubmitting}
              {...register('nameLast')}
            />
            {errors.nameLast && (
              <FieldError className="mt-1">
                {errors.nameLast.message}
              </FieldError>
            )}
          </div>
        </div>

        <div className="mb-3">
          <Label htmlFor="email">{t('registration.email.label')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('registration.email.placeholder')}
            disabled={isSubmitting}
            {...register('email')}
          />
          {errors.email && (
            <FieldError className="mt-1">{errors.email.message}</FieldError>
          )}
        </div>

        {!isLoadingAttributes && attributes.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attributes.map((attr) => (
                <div className="mb-3" key={attr.name}>
                  <Label htmlFor={`attr-${attr.name}`}>{attr.label}</Label>
                  <Input
                    id={`attr-${attr.name}`}
                    type="text"
                    placeholder={attr.example ?? ''}
                    disabled={isSubmitting}
                    {...register(`attributes.${attr.name}`)}
                  />
                  {errors.attributes?.[attr.name] && (
                    <FieldError className="mt-1">
                      {errors.attributes[attr.name]?.message}
                    </FieldError>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || isLoadingAttributes}
          size="lg"
          className="w-full"
        >
          {isSubmitting
            ? t('registration.submitting')
            : t('registration.submit')}
        </Button>
      </form>

      <p className="text-center text-muted-foreground mt-3 text-sm">
        {t('registration.footerNote')}
      </p>
    </SurveyPageContainer>
  )
}
