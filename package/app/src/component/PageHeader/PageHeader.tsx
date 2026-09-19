import React, { ReactNode } from 'react'

import { cn } from 'common/cn'
import { BackButton } from 'component/BackButton'
import { hasInAppBackHistory } from 'common'

interface PageHeaderProps {
  title?: string
  description?: string
  backUrl?: string
  rightNav?: ReactNode
  inlineNav?: ReactNode
  maxWidth?: string
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  backUrl,
  rightNav,
  inlineNav,
  maxWidth = 'max-w-2xl',
  className,
}) => {
  // Show the back button whenever there's a tracked in-app predecessor page
  // (BackButton can navigate(-1) to it) or a fallback URL was provided —
  // hide it only when neither is available.
  const showBack = Boolean(backUrl) || hasInAppBackHistory()
  const hasSideNav = Boolean(showBack || rightNav)
  // Full-width headers have no side margin for the absolutely-positioned
  // back button/rightNav to sit in without overlapping the content, so show
  // them on their own row above the content at all breakpoints instead of
  // only on mobile.
  const isFullWidth = maxWidth === 'max-w-none'
  return (
    <div className={cn('mb-6', className)}>
      {hasSideNav && (
        <div
          className={cn(
            'flex items-start justify-between mb-3',
            !isFullWidth && 'lg:hidden',
          )}
        >
          <div>{showBack && <BackButton fallbackUrl={backUrl} />}</div>
          <div>{rightNav}</div>
        </div>
      )}
      <div className={cn(!isFullWidth && 'relative')}>
        {!isFullWidth && showBack && (
          <div className="hidden lg:flex items-start absolute left-0 top-0">
            <BackButton fallbackUrl={backUrl} />
          </div>
        )}
        {!isFullWidth && rightNav && (
          <div className="hidden lg:flex items-start absolute right-0 top-0">
            {rightNav}
          </div>
        )}
        <div className={cn(maxWidth, 'mx-auto gap-4')}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {title && <h1 className="text-2xl font-bold">{title}</h1>}
            {inlineNav && (
              <div className="shrink-0 flex items-start self-end sm:self-auto">
                {inlineNav}
              </div>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
