import React from 'react'
import { cn } from 'common/cn'
import { SurveyFooter } from './SurveyFooter'

type Props = {
  children: React.ReactNode
  className?: string
  noBrand?: boolean
}

export const SurveyPageContainer: React.FC<Props> = ({
  children,
  className,
  noBrand,
}) => {
  return (
    <div className="container-fluid">
      <div
        className={cn('min-h-screen flex flex-col center-column', className)}
      >
        <div className="survey-container flex-1 px-4 pt-6 pb-4 mx-auto w-full max-w-4xl">
          {children}
        </div>
        {!noBrand && <SurveyFooter />}
      </div>
    </div>
  )
}
