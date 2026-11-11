import type { FormEventHandler, ReactNode } from 'react'

import { cn } from 'common/cn'

type Props = {
  title: ReactNode
  description?: ReactNode
  /** Renders the layout as a `<form>` when given, otherwise as a `<div>`. */
  onSubmit?: FormEventHandler<HTMLFormElement>
  className?: string
  children: ReactNode
}

const WRAPPER_CLASS =
  'flex items-center justify-center p-6 md:p-8 min-h-[400px]'

/** Centred column with a heading, shared by the login, signup and two-factor forms. */
export const AuthFormLayout: React.FC<Props> = ({
  title,
  description,
  onSubmit,
  className,
  children,
}) => {
  const content = (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-balance text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  )

  return onSubmit ? (
    <form className={cn(WRAPPER_CLASS, className)} onSubmit={onSubmit}>
      {content}
    </form>
  ) : (
    <div className={cn(WRAPPER_CLASS, className)}>{content}</div>
  )
}
