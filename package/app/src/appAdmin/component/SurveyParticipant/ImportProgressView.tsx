import React from 'react'
import { Progress } from 'component/shadcn/progress'

type ImportProgressViewProps = {
  imported: number
  errors: number
}

export const ImportProgressView: React.FC<ImportProgressViewProps> = ({
  imported,
  errors,
}) => {
  return (
    <div className="text-center py-12">
      <h5 className="text-lg font-medium mb-3">Importing Participants...</h5>
      <div className="mb-3">
        <p className="text-lg font-semibold">{imported} imported</p>
        {errors > 0 && (
          <p className="text-sm text-destructive">{errors} errors</p>
        )}
      </div>
      <Progress value={undefined} className="mb-3" />
      <p className="text-muted-foreground text-sm">
        Processing in batches of 500...
      </p>
    </div>
  )
}
