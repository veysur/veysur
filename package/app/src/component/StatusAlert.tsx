import React from 'react'
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from 'component/shadcn/alert'
import { cn } from 'common/cn'

type StatusAlertVariant = 'success' | 'warning' | 'error' | 'info'

type StatusAlertProps = {
  variant: StatusAlertVariant
  title?: string
  children: React.ReactNode
  className?: string
  showIcon?: boolean
  iconSize?: number
}

const VARIANT_CONFIG = {
  success: {
    icon: CheckCircle,
    alertVariant: 'success' as const,
  },
  warning: {
    icon: AlertTriangle,
    alertVariant: 'warning' as const,
  },
  error: {
    icon: AlertCircle,
    alertVariant: 'destructive' as const,
  },
  info: {
    icon: Info,
    alertVariant: 'info' as const,
  },
}

export const StatusAlert: React.FC<StatusAlertProps> = ({
  variant,
  title,
  children,
  className,
  showIcon = true,
  iconSize = 20,
}) => {
  const config = VARIANT_CONFIG[variant]
  const Icon = config.icon

  return (
    <Alert variant={config.alertVariant} className={cn(className)}>
      {showIcon && <Icon size={iconSize} />}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
