import React from 'react'
import { Trash2, Download } from 'lucide-react'
import { Survey } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { DropdownMenuItem } from 'component/shadcn/dropdown-menu'
import { ActionMenu } from 'component/ActionMenu'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'
import { useFlashMessage } from 'component/FlashMessage'

import { useSurveyDelete, useSurveyExport } from './hook'

type Props = {
  survey: Survey
}

export const SurveyActionDropdown: React.FC<Props> = ({ survey }) => {
  const { surveyDelete } = useSurveyDelete()
  const { exportSurvey, isExporting } = useSurveyExport()
  const { showFlashMessage } = useFlashMessage()

  const deleteAction = async () => {
    await surveyDelete(survey._id)
    showFlashMessage('success', 'Survey deleted successfully')
  }

  const handleExport = async () => {
    try {
      await exportSurvey(survey._id)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  return (
    <ActionMenu>
      <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
        <Download className="h-4 w-4" />
        <span>{isExporting ? 'Exporting...' : 'Export as .vsst'}</span>
      </DropdownMenuItem>

      <DialogConfirmClickable
        as={DropdownMenuItem}
        element={Button}
        title="Delete Survey"
        message={`Are you sure you want to delete "${survey.name}". `}
        comment="This cannot be undone."
        actionText="Delete"
        confirmAction={deleteAction}
        className="text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete</span>
      </DialogConfirmClickable>
    </ActionMenu>
  )
}

export default SurveyActionDropdown
