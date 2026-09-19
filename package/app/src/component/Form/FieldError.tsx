import { AlertCircle } from 'lucide-react'

import { cn } from 'common/cn'

interface FieldErrorProps {
  className?: string
  children?: React.ReactNode
  errors?: string[]
}

export const FieldError: React.FC<FieldErrorProps> = ({
  className,
  children,
  errors,
}) => {
  if (errors ? errors.length === 0 : !children) return null

  return (
    <div
      className={cn(
        'flex items-start gap-1.5 rounded-md bg-destructive/10 dark:bg-[var(--field-error-bg)] px-2.5 py-1.5 text-sm font-medium text-destructive',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {errors ? (
        <div className="space-y-1">
          {errors.map((error, i) => (
            <div key={i}>{error}</div>
          ))}
        </div>
      ) : (
        <span>{children}</span>
      )}
    </div>
  )
}
