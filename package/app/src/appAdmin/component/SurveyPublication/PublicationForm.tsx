import React from 'react'

import { LabelNotesEntityForm } from 'appAdmin/component/LabelNotesEntityForm'

type Props = {
  title: string
  onSubmit: (data: { label: string; notes: string }) => Promise<void>
  isLoading?: boolean
  error?: string | null
  initialData?: { label?: string | null; notes?: string | null }
}

export const PublicationForm: React.FC<Props> = (props) => (
  <LabelNotesEntityForm entityName="Publication" {...props} />
)
