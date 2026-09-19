import React from 'react'

import { Skeleton } from 'component/shadcn/skeleton'
import { SurveyEditorNavContainer } from 'appAdmin/component/SurveyEditor/SurveyEditorNavContainer'
import { SurveyEditorPlaceholder } from 'appAdmin/component/SurveyEditor'

const SkeletonHeaderBar: React.FC = () => (
  <div className="z-40 bg-sidebar border-b py-2">
    <div className="px-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-7 w-7 lg:hidden" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-7 w-24" />
      </div>
    </div>
  </div>
)

export const PageSurveyEditSkeleton: React.FC = () => (
  <div className="h-screen overflow-hidden max-w-full">
    <SurveyEditorNavContainer headerBar={() => <SkeletonHeaderBar />}>
      <div className="flex-1 overflow-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-4xl box-border">
          <SurveyEditorPlaceholder />
        </div>
      </div>
    </SurveyEditorNavContainer>
  </div>
)
