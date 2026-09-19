import React from 'react'
import { CloudUpload } from 'lucide-react'

import { Button } from 'component/shadcn/button'
import { Spinner } from 'component/shadcn/spinner'

type Props = {
  isLoading: boolean
  isSettingsSaving: boolean
  onClick: () => void
}

export const PublishButton: React.FC<Props> = ({
  isLoading,
  isSettingsSaving,
  onClick,
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading || isSettingsSaving}
      className="flex items-center gap-2"
    >
      {isLoading ? <Spinner size="sm" /> : <CloudUpload className="h-4 w-4" />}
      <span>Open</span>
    </Button>
  )
}
