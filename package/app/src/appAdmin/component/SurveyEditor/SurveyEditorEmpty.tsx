import React from 'react'

import { Card, CardContent } from 'component/shadcn/card'

import { AddElementPanel } from './AddElementPanel'

export const SurveyEditorEmpty: React.FC = () => {
  return (
    <div className="empty-survey-state">
      <Card className="border-2 border-dashed text-center py-5">
        <CardContent>
          <div className="text-muted-foreground mb-4">
            <h5 className="mb-2">Start building your survey</h5>
            <p className="mb-0">Add questions and groups to get started</p>
          </div>
          <AddElementPanel className="ml-0 pl-0" />
        </CardContent>
      </Card>
    </div>
  )
}
