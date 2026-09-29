import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Survey } from 'veysur-common'

import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { FieldError } from 'component/Form'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'component/shadcn/card'
import { ErrorRest } from 'model/api'

import { useSurveyCreate } from '../hook'
import { SurveySchemaNew } from '../model'
import { SurveyTemplatePicker } from './SurveyTemplatePicker'

const schema = new SurveySchemaNew()

type FieldErrors = { [key: string]: string[] | undefined }

const flattenValidationErrors = (errors: object): FieldErrors => {
  const flat: FieldErrors = {}
  for (const [path, pathErrors] of Object.entries(errors)) {
    if (Array.isArray(pathErrors)) flat[path] = pathErrors
  }
  return flat
}

export const SurveyFormNew: React.FC = () => {
  const [survey, setSurvey] = useState<Survey>()
  const [formState, setFormState] = useState<{
    name: string
    templateId: string | undefined
  }>({ name: '', templateId: undefined })
  const [errors, setErrors] = useState<FieldErrors>({})
  const { surveyCreate, isLoading: formIsLoading } = useSurveyCreate()

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name: inputName, value } = event.target
    setErrors({ ...errors, [inputName]: undefined })
    setFormState((prevState) => ({ ...prevState, name: value }))
  }

  const handleTemplateChange = (
    templateId: string | undefined,
    templateName?: string,
  ) => {
    setFormState((prevState) => ({
      templateId,
      name:
        templateName && !prevState.name.trim() ? templateName : prevState.name,
    }))
    if (templateName) {
      setErrors((prevErrors) => ({ ...prevErrors, name: undefined }))
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (formIsLoading) return
    setErrors({})
    const { isValid, errors } = await schema.validate({ name: formState.name })
    if (isValid) {
      try {
        const survey = await surveyCreate(
          { name: formState.name },
          formState.templateId,
        )
        setSurvey(survey)
      } catch (error) {
        if (error instanceof ErrorRest) {
          setErrors({ form: [error.message || error.userMessage] })
        } else {
          setErrors({ form: ['An unexpected error occurred'] })
        }
      }
    } else if (errors) {
      setErrors(flattenValidationErrors(errors))
    }
    return false
  }

  return !survey ? (
    <form noValidate onSubmit={handleSubmit}>
      {errors?.form && (
        <Alert variant="destructive" className="mb-3 mx-auto max-w-3xl">
          <AlertDescription>{errors.form.join(', ')}</AlertDescription>
        </Alert>
      )}
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Survey Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 relative">
            <Label htmlFor="name" className="mb-2">
              Name{' '}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(required)</span>
            </Label>
            <Input
              id="name"
              type="text"
              name="name"
              placeholder="New survey name"
              value={formState.name}
              onChange={handleNameChange}
              className={errors?.name ? 'border-destructive' : ''}
            />
            {errors?.name && (
              <FieldError className="mt-1">{errors.name.join(', ')}</FieldError>
            )}
          </div>
          <div className="mt-6 border-t pt-4">
            <SurveyTemplatePicker
              value={formState.templateId}
              onChange={handleTemplateChange}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={formIsLoading}>
            {formIsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Survey
          </Button>
        </CardFooter>
      </Card>
    </form>
  ) : (
    <Navigate to={`/survey/${survey?._id}/edit`} />
  )
}
