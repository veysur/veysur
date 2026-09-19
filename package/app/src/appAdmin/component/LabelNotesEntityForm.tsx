import React, { useState } from 'react'

import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'component/shadcn/card'
import { ContentEditor } from 'appAdmin/component/ContentEditor/ContentEditor'

type Props = {
  title: string
  entityName: string
  onSubmit: (data: { label: string; notes: string }) => Promise<void>
  isLoading?: boolean
  error?: string | null
  initialData?: { label?: string | null; notes?: string | null }
}

export const LabelNotesEntityForm: React.FC<Props> = ({
  title,
  entityName,
  onSubmit,
  isLoading = false,
  error = null,
  initialData,
}) => {
  const [formData, setFormData] = useState(() => ({
    label: initialData?.label || '',
    notes: initialData?.notes || '',
  }))

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await onSubmit(formData)
    } catch {
      // Error handling is managed by parent component
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              type="text"
              placeholder={`${entityName} label (e.g., v1.0, Initial Release)`}
              value={formData.label}
              onChange={(e) => handleChange('label', e.target.value)}
            />
          </div>

          <div className="mb-3">
            <Label htmlFor="notes">Notes</Label>
            <ContentEditor
              value={formData.notes}
              onChange={(value) => handleChange('notes', value)}
              placeholder={`${entityName} notes or description`}
              withToolbar={true}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Updating...' : `Update ${entityName}`}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
