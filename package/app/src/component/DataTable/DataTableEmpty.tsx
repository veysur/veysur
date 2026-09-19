import * as React from 'react'

export interface DataTableEmptyProps {
  /** Custom message to display (default: "No items found.") */
  message?: string
  /** Custom icon or component to display above message */
  icon?: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

export const DataTableEmpty: React.FC<DataTableEmptyProps> = ({
  message = 'No items found.',
  icon,
  className,
}) => {
  return (
    <div className={`text-center py-8 ${className || ''}`}>
      {icon && <div className="mb-3 flex justify-center">{icon}</div>}
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}
