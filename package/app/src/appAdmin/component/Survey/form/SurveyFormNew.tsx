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
import {
  SURVEY_TEMPLATE_BLANK,
  SurveyTemplatePicker,
} from './SurveyTemplatePicker'

const schema = new SurveySchemaNew()

export const SurveyFormNew: React.FC = () => {
  const [survey, setSurvey] = useState<Survey>()
  const [formState, setFormState] = useState({
    name: '',
  })
  const [templateId, setTemplateId] = useState(SURVEY_TEMPLATE_BLANK)
  const [errors, setErrors] = useState<{
    [key: string]: string[] | undefined
  }>({})
  const { surveyCreate, isLoading: formIsLoading } = useSurveyCreate()

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target
    const value =
      target?.type && target?.type === 'checkbox'
        ? target.checked
        : target.value
    const inputName = target.name
    setErrors({ ...errors, [inputName]: undefined })
    setFormState((prevState) => ({
      ...prevState,
      [inputName]: value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (formIsLoading) return
    setErrors({})
    const data = {
      name: formState.name,
    }
    const { isValid, errors } = await schema.validate(formState)
    if (isValid) {
      try {
        const survey = await surveyCreate(
          { name: data.name },
          templateId === SURVEY_TEMPLATE_BLANK ? undefined : templateId,
        )
        setSurvey(survey)
      } catch (error) {
        if (error instanceof ErrorRest) {
          setErrors({ ...errors, form: [error.message || error.userMessage] })
        } else {
          setErrors({ form: ['An unexpected error occurred'] })
        }
      }
    } else if (errors) {
      const flatErrors: { [key: string]: string[] | undefined } = {}
      for (const path in errors) {
        const pathErrors = errors[path]
        if (Array.isArray(pathErrors)) {
          flatErrors[path] = pathErrors
        }
      }
      setErrors(flatErrors)
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
              Name
            </Label>
            <Input
              id="name"
              type="text"
              name="name"
              placeholder="New survey name"
              value={formState.name}
              onChange={handleInputChange}
              className={errors?.name ? 'border-destructive' : ''}
            />
            {errors?.name && (
              <FieldError className="mt-1">{errors.name.join(', ')}</FieldError>
            )}
          </div>
          <SurveyTemplatePicker value={templateId} onChange={setTemplateId} />
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
