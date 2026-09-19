import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import type { VariantProps } from 'class-variance-authority'

import { Badge, badgeVariants } from 'component/shadcn/badge'

type Props = {
  icon?: LucideIcon
  title?: string
  variant?: VariantProps<typeof badgeVariants>['variant']
  label?: string
  description?: string
  headerClassName?: string
  children?: ReactNode
}

export function SectionHeader({
  icon: Icon,
  title,
  variant,
  label,
  description,
  headerClassName,
  children,
}: Props) {
  const labelContent = label && (
    <Badge variant={variant || 'default'} className="opacity-75">
      {label || ''}
    </Badge>
  )
  const descriptionContent = description && (
    <p className="text-sm text-muted-foreground">{description || ''}</p>
  )

  return (
    <div className="flex flex-row justify-between items-start mb-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {Icon && <Icon className="h-6 w-6 text-muted-foreground" />}
          <h2 className={headerClassName || 'text-xl font-semibold'}>
            {title || ''}
          </h2>
        </div>
        {descriptionContent}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {labelContent}
        {children}
      </div>
    </div>
  )
}
