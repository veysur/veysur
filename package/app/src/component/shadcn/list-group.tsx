import { cn } from 'common/cn'

export function ListGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <ul className={cn('divide-y divide-border/50 rounded-md', className)}>
      {children}
    </ul>
  )
}

export function ListGroupItem({
  children,
  className,
  active,
  onClick,
  ...rest
}: React.LiHTMLAttributes<HTMLLIElement> & {
  active?: boolean
}) {
  return (
    <li
      className={cn(
        'list-none px-3 py-2 hover:bg-accent transition-colors',
        active && 'bg-accent',
        className,
      )}
      onClick={onClick}
      {...rest}
    >
      {children}
    </li>
  )
}
