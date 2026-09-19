import React from 'react'
import { Edit, Trash2 } from 'lucide-react'

import { Button } from 'component/shadcn/button'

interface ResponseViewHeaderProps {
  onEdit: () => void
  onDelete: () => void
}

export const ResponseViewHeader: React.FC<ResponseViewHeaderProps> = ({
  onEdit,
  onDelete,
}) => {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </Button>
      <Button variant="outline" size="sm" onClick={onDelete}>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
    </div>
  )
}
