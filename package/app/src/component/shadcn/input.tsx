import * as React from 'react'

import { cn } from '@/common/cn'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    // Password managers (e.g. LastPass) inject a hidden autofill icon element
    // as a sibling immediately after the input, adding an extra child that
    // breaks flex/grid alignment in parent layouts. Wrapping the input keeps
    // the injected element contained instead of affecting the parent's layout.
    <div className={cn('w-full', className)}>
      <input
        type={type}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/23 border-input h-9 w-full min-w-24 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className,
        )}
        {...props}
      />
    </div>
  )
}

export { Input }
