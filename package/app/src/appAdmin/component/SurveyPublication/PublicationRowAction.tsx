import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Eye, Merge, PackageOpen, Pencil, Trash2 } from 'lucide-react'
import { SurveyPublication } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { DropdownMenuItem } from 'component/shadcn/dropdown-menu'
import { ActionMenu } from 'component/ActionMenu'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'
import { useFlashMessage } from 'component/FlashMessage'

import {
  usePublicationDelete,
  useExportSurveyResponse,
  useExportSurveyPublication,
} from './hook'

type Props = {
  publication: SurveyPublication
  surveyId: string
}

export const PublicationRowAction: React.FC<Props> = ({
  publication,
  surveyId,
}) => {
  const navigate = useNavigate()
  const { showFlashMessage } = useFlashMessage()
  const { publicationDelete } = usePublicationDelete(surveyId)
  const { exportResponses, isExporting } = useExportSurveyResponse()
  const { exportPublication, isExporting: isExportingPublication } =
    useExportSurveyPublication()

  const deleteAction = async () => {
    await publicationDelete(publication._id)
    showFlashMessage('success', 'Publication deleted successfully')
  }

  const handleEdit = () => {
    navigate(`/survey/${surveyId}/publication/${publication._id}/edit`)
  }

  const handleViewDetails = () => {
    navigate(`/survey/${surveyId}/response?publicationId=${publication._id}`)
  }

  const handleMerge = () => {
    navigate(`/survey/${surveyId}/publication/${publication._id}/merge`)
  }

  const label = publication.label ? ' - ' + publication.label : ''
  const displayName = `${publication._id.slice(-8)}${label}`
  const isActivePublication = !publication.stoppedAt

  return (
    <ActionMenu title={undefined}>
      <DropdownMenuItem onClick={handleEdit}>
        <Pencil className="h-4 w-4" />
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleViewDetails}>
        <Eye className="h-4 w-4" />
        View Responses
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleMerge}>
        <Merge className="h-4 w-4" />
        Merge Responses
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() =>
          exportResponses({ surveyId, publicationId: publication._id })
        }
        disabled={isExporting}
      >
        <Download className="h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export Responses (.json)'}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() =>
          exportPublication({ surveyId, publicationId: publication._id })
        }
        disabled={isExportingPublication}
      >
        <PackageOpen className="h-4 w-4" />
        {isExportingPublication ? 'Exporting...' : 'Export Publication (.vssp)'}
      </DropdownMenuItem>
      <DialogConfirmClickable
        as={DropdownMenuItem}
        element={Button}
        title={
          isActivePublication
            ? 'Unpublish and Delete Publication'
            : 'Delete Publication'
        }
        message={
          isActivePublication
            ? `"${displayName}" is currently published. Deleting it will unpublish ` +
              `your survey - participants will no longer be able to respond - and ` +
              `will permanently remove the publication record and all related survey ` +
              `responses. This action cannot be undone.`
            : `Are you sure you want to delete "${displayName}"? ` +
              `This will delete the publication record and all related survey responses. ` +
              `This action cannot be undone.`
        }
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

export default PublicationRowAction
