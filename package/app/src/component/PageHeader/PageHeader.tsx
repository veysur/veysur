import React, { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import type { VariantProps } from 'class-variance-authority'

import { cn } from 'common/cn'
import { BackButton } from 'component/BackButton'
import { hasInAppBackHistory } from 'common'
import { Badge, badgeVariants } from 'component/shadcn/badge'

interface PageHeaderProps {
  icon?: LucideIcon
  title?: string
  description?: string
  label?: string
  variant?: VariantProps<typeof badgeVariants>['variant']
  backUrl?: string
  /** Force-hide the back button, e.g. when the surrounding layout already renders its own (see SurveyPageContent). */
  showBack?: boolean
  rightNav?: ReactNode
  inlineNav?: ReactNode
  maxWidth?: string
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  description,
  label,
  variant,
  backUrl,
  showBack: showBackProp = true,
  rightNav,
  inlineNav,
  maxWidth = 'max-w-2xl',
  className,
}) => {
  // Show the back button whenever there's a tracked in-app predecessor page
  // (BackButton can navigate(-1) to it) or a fallback URL was provided —
  // hide it only when neither is available, or the caller opted out.
  const showBack =
    showBackProp && (Boolean(backUrl) || hasInAppBackHistory())
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
            // Pulls the row up so the gap above the back button (otherwise
            // just the ambient page-top padding) roughly matches the mb-3
            // gap below it, before the title.
            '-mt-5 flex items-start justify-between mb-3',
            !isFullWidth && 'lg:hidden',
          )}
        >
          <div>{showBack && <BackButton fallbackUrl={backUrl} />}</div>
          <div>{rightNav}</div>
        </div>
      )}
      {/* The relative container wraps only the title/inlineNav row (not
          the description), so top-1/2 centres the back button/rightNav
          against that row's own height, not the whole header block. It
          stays positioned at the header's full width, outside the
          maxWidth box, so it never shifts the title's own left edge —
          that edge has to stay aligned with content below (e.g. a card)
          that shares the same maxWidth. */}
      <div className={cn(!isFullWidth && 'relative')}>
        {!isFullWidth && showBack && (
          <div className="hidden lg:flex items-center absolute left-0 top-1/2 -translate-y-1/2">
            <BackButton fallbackUrl={backUrl} />
          </div>
        )}
        {!isFullWidth && rightNav && (
          <div className="hidden lg:flex items-center absolute right-0 top-1/2 -translate-y-1/2">
            {rightNav}
          </div>
        )}
        <div className={cn(maxWidth, 'mx-auto')}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {title && (
              <div className="flex items-center gap-3">
                {Icon && <Icon className="h-6 w-6 text-muted-foreground" />}
                <h1 className="text-2xl font-bold">{title}</h1>
              </div>
            )}
            {(label || inlineNav) && (
              <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto">
                {label && (
                  <Badge variant={variant || 'default'} className="opacity-75">
                    {label}
                  </Badge>
                )}
                {inlineNav}
              </div>
            )}
          </div>
        </div>
      </div>
      {description && (
        <div className={cn(maxWidth, 'mx-auto')}>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        </div>
      )}
    </div>
  )
}
