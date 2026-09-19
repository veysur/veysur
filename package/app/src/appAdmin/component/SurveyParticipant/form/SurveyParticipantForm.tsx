import React, { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Iso639v1,
  SurveyParticipant,
  getLanguageName,
  sortLanguageCodesByName,
} from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import { mzenResolver } from 'common/hookform/mzenResolver'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'component/shadcn/card'
import { Separator } from 'component/shadcn/separator'
import { FieldError } from 'component/Form'

import { SurveyParticipantAttributeRow } from '../hook/useSurveyParticipantAttributeList'
import { buildParticipantFormSchema, ParticipantFormData } from '../model'

type Props = {
  title: string
  onSubmit: (data: Partial<PropsOf<SurveyParticipant>>) => Promise<void>
  isLoading?: boolean
  error?: string | null
  initialData?: Partial<PropsOf<SurveyParticipant>>
  isEditMode?: boolean
  customAttributes?: SurveyParticipantAttributeRow[]
}

export const SurveyParticipantForm: React.FC<Props> = ({
  title,
  onSubmit,
  isLoading = false,
  error = null,
  initialData,
  isEditMode = false,
  customAttributes,
}) => {
  const schema = useMemo(
    () => buildParticipantFormSchema(customAttributes),
    [customAttributes],
  )

  const languageCodes = useMemo(
    () => sortLanguageCodesByName(Object.keys(Iso639v1)),
    [],
  )

  const form = useForm<ParticipantFormData>({
    resolver: mzenResolver(schema),
    defaultValues: {
      nameFirst: '',
      nameLast: '',
      email: '',
      language: 'en',
      token: '',
      attributes: {},
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        nameFirst: initialData.nameFirst || '',
        nameLast: initialData.nameLast || '',
        email: initialData.email || '',
        language: initialData.language || 'en',
        token: initialData.token || '',
        attributes: (initialData.attributes as Record<string, string>) ?? {},
      })
    }
  }, [initialData, form])

  const handleSubmit = async (data: ParticipantFormData) => {
    await onSubmit(data)
  }

  const errors = form.formState.errors

  return (
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)}>
      {error && (
        <Alert variant="destructive" className="mb-3 mx-auto max-w-3xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>{title || 'Add/Edit Participant'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-3">
              <Label htmlFor="nameFirst">First Name</Label>
              <Input
                id="nameFirst"
                type="text"
                placeholder="First name"
                {...form.register('nameFirst')}
              />
              {errors.nameFirst && (
                <FieldError className="mt-1">
                  {errors.nameFirst.message}
                </FieldError>
              )}
            </div>
            <div className="mb-3">
              <Label htmlFor="nameLast">Last Name</Label>
              <Input
                id="nameLast"
                placeholder="Last name"
                type="text"
                {...form.register('nameLast')}
              />
              {errors.nameLast && (
                <FieldError className="mt-1">
                  {errors.nameLast.message}
                </FieldError>
              )}
            </div>
            <div className="mb-3">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {errors.email && (
                <FieldError className="mt-1">{errors.email.message}</FieldError>
              )}
            </div>
            <div className="mb-3">
              <Label htmlFor="token">Token (Optional)</Label>
              <Controller
                name="token"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="token"
                    type="text"
                    placeholder="Leave empty to auto-generate"
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                  />
                )}
              />
              {errors.token ? (
                <FieldError className="mt-1">{errors.token.message}</FieldError>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  Alphanumeric uppercase only. Auto-generated if left empty.
                </p>
              )}
            </div>
            <div className="mb-3">
              <Label htmlFor="language">Language</Label>
              <Controller
                name="language"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageCodes.map((code) => (
                        <SelectItem value={code} key={code}>
                          {getLanguageName(code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {!!customAttributes?.length && (
            <>
              <Separator className="my-4" />
              <p className="text-sm font-semibold text-muted-foreground my-3">
                Custom Attributes
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customAttributes.map((attr) => (
                  <div className="mb-3" key={attr.name}>
                    <Label htmlFor={`attr-${attr.name}`}>{attr.label}</Label>
                    <Input
                      id={`attr-${attr.name}`}
                      type="text"
                      placeholder={attr.example ?? ''}
                      {...form.register(`attributes.${attr.name}`)}
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
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? isEditMode
                ? 'Updating...'
                : 'Creating...'
              : isEditMode
                ? 'Update Participant'
                : 'Create Participant'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
