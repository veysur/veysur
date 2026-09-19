import React from 'react'
import { BackButton } from 'component/BackButton'
import { cn } from 'common/cn'

interface SurveyPageContentProps {
  /** Back button URL for navigation */
  backButtonUrl?: string
  /** Optional custom back button click handler */
  onBackClick?: () => void
  /** Optional back button label (defaults to "Back") */
  backButtonLabel?: string
  /** The main content to render */
  children: React.ReactNode
  /** Optional additional className for content wrapper */
  className?: string
  /** Whether to show the back button (defaults to true if backButtonUrl provided) */
  showBackButton?: boolean
  /** Optional header actions to display on the right side of the navigation row */
  headerActions?: React.ReactNode
  /** Optional page header content (e.g., PageHeader component for list pages) displayed below the navigation row */
  pageHeader?: React.ReactNode
}

export const SurveyPageContent: React.FC<SurveyPageContentProps> = ({
  backButtonUrl,
  onBackClick,
  backButtonLabel = 'Back',
  children,
  className,
  showBackButton = true,
  headerActions,
  pageHeader,
}) => {
  const showButton = showBackButton && (backButtonUrl || onBackClick)
  const showNavRow = showButton || headerActions

  return (
    <div className="flex-1 overflow-y-auto min-w-0">
      <div className="p-4">
        {showNavRow && (
          <div className="flex justify-between items-center mb-4">
            <div>
              {showButton && (
                <BackButton
                  fallbackUrl={backButtonUrl || '/'}
                  onClick={onBackClick}
                  label={backButtonLabel}
                />
              )}
            </div>
            {headerActions && <div>{headerActions}</div>}
          </div>
        )}
        {pageHeader && <div className="mb-6">{pageHeader}</div>}
        <div className={cn(className)}>{children}</div>
      </div>
    </div>
  )
}
