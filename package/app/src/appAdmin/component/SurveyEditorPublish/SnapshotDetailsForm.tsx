import React from 'react'

import { ContentEditor } from 'appAdmin/component/ContentEditor/ContentEditor'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'

type Props = {
  label: string
  notes: string
  onLabelChange: (value: string) => void
  onNotesChange: (value: string) => void
  idPrefix?: string
  labelPlaceholder?: string
  notesPlaceholder?: string
}

export const SnapshotDetailsForm: React.FC<Props> = ({
  label,
  notes,
  onLabelChange,
  onNotesChange,
  idPrefix = 'snapshot',
  labelPlaceholder = 'e.g., Initial Snapshot or Updated xyz ...',
  notesPlaceholder = 'Add notes about this snapshot...',
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-label`}>Label</Label>
        <Input
          id={`${idPrefix}-label`}
          placeholder={labelPlaceholder}
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <ContentEditor
          value={notes}
          onChange={onNotesChange}
          placeholder={notesPlaceholder}
          withToolbar={true}
          toolbarExtra={true}
        />
      </div>
    </div>
  )
}
