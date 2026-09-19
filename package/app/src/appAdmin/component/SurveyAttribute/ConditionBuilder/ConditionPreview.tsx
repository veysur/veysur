import { cn } from 'common/cn'

interface ConditionPreviewProps {
  code: string
  className?: string
}

export function ConditionPreview({ code, className }: ConditionPreviewProps) {
  if (!code) {
    return (
      <div
        className={cn(
          'bg-muted/50 rounded-md p-3 text-sm text-muted-foreground italic',
          className,
        )}
      >
        No condition defined
      </div>
    )
  }

  return (
    <div className={cn('rounded-md border', className)}>
      <div className="px-3 py-1.5 bg-muted/50 border-b text-xs text-muted-foreground font-medium">
        Generated JavaScript
      </div>
      <pre className="p-3 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  )
}
