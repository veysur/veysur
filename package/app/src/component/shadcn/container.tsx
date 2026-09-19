import { cn } from 'common/cn'

export function Container({
  children,
  fluid = false,
  className,
}: {
  children: React.ReactNode
  fluid?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        fluid ? 'w-full px-4' : 'container mx-auto px-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
