import React from 'react'
import { Upload } from 'lucide-react'
import { Progress } from 'component/shadcn/progress'

type SurveyImportProgressViewProps = {
  stage: 'uploading' | 'processing'
}

export const SurveyImportProgressView: React.FC<
  SurveyImportProgressViewProps
> = ({ stage }) => {
  return (
    <div className="text-center py-12">
      <Upload className="mx-auto mb-3 text-muted-foreground" size={48} />
      <h5 className="text-lg font-medium mb-3">
        {stage === 'uploading'
          ? 'Uploading to server...'
          : 'Processing import...'}
      </h5>
      <Progress value={undefined} className="mb-3" />
      <p className="text-muted-foreground text-sm">
        {stage === 'uploading'
          ? 'Please wait while we upload your file'
          : 'Validating and importing survey data...'}
      </p>
    </div>
  )
}
