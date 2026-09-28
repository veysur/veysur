import React from 'react'
import { Trash2, Pencil, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Survey } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { DropdownMenuItem } from 'component/shadcn/dropdown-menu'
import { ActionMenu } from 'component/ActionMenu'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'
import { useFlashMessage } from 'component/FlashMessage'

import {
  useSurveyDelete,
  useSurveyExport,
  useSurveyExportMarkdown,
  useSurveyFullExport,
} from './hook'

type Props = {
  survey: Survey
}

export const SurveyRowAction: React.FC<Props> = ({ survey }) => {
  const { surveyDelete } = useSurveyDelete()
  const { exportSurvey, isExporting } = useSurveyExport()
  const { exportSurveyFull, isExportingFull } = useSurveyFullExport()
  const { exportSurveyMarkdown, isExportingMarkdown } =
    useSurveyExportMarkdown()
  const { showFlashMessage } = useFlashMessage()

  const deleteAction = async () => {
    await surveyDelete(survey._id)
    showFlashMessage('success', 'Survey deleted successfully')
  }

  const handleExport = async () => {
    try {
      await exportSurvey(survey._id)
    } catch (error) {
      showFlashMessage(
        'error',
        error instanceof Error ? error.message : 'Export failed',
      )
    }
  }

  const handleExportFull = async () => {
    try {
      await exportSurveyFull(survey._id)
    } catch (error) {
      showFlashMessage(
        'error',
        error instanceof Error ? error.message : 'Export failed',
      )
    }
  }

  const handleExportMarkdown = async () => {
    try {
      await exportSurveyMarkdown(survey._id)
    } catch (error) {
      showFlashMessage(
        'error',
        error instanceof Error ? error.message : 'Export failed',
      )
    }
  }

  return (
    <ActionMenu title={undefined}>
      <DropdownMenuItem asChild>
        <Link to={`/survey/${survey._id}/edit`}>
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
        <Download className="h-4 w-4" />
        <span>{isExporting ? 'Exporting...' : 'Export as .vsst'}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleExportFull} disabled={isExportingFull}>
        <Download className="h-4 w-4" />
        <span>{isExportingFull ? 'Exporting...' : 'Export as .vssa'}</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={handleExportMarkdown}
        disabled={isExportingMarkdown}
      >
        <Download className="h-4 w-4" />
        <span>
          {isExportingMarkdown ? 'Exporting...' : 'Export as Markdown'}
        </span>
      </DropdownMenuItem>
      <DialogConfirmClickable
        as={DropdownMenuItem}
        element={Button}
        title="Delete Survey"
        message={`Are you sure you want to delete "${survey.name}". `}
        comment="This cannot be undone."
        actionText="Delete"
        confirmAction={deleteAction}
        size="sm"
        className="text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </DialogConfirmClickable>
    </ActionMenu>
  )
}

export default SurveyRowAction
