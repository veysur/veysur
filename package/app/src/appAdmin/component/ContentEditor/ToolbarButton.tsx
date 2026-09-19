import React from 'react'

import { cn } from 'common/cn'

type ToolbarButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}

/**
 * Plain, borderless button used throughout the ContentEditor bubble toolbar
 * (Bold, Italic, Link, ...). `forwardRef` + prop-spreading so it can also
 * serve as a Radix `asChild` trigger target (see `VariablePicker`'s
 * `triggerVariant="ghost"`) - Radix clones extra props (`ref`, `onClick`,
 * `aria-*`) onto its `asChild` child, which requires ref forwarding to work
 * at all, and needs those props to land on the actual `<button>` rather
 * than being swallowed by a fixed prop list.
 */
export const ToolbarButton = React.forwardRef<
  HTMLButtonElement,
  ToolbarButtonProps
>(({ active, className, onMouseDown, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    onMouseDown={(e) => {
      // Prevent the editor from losing focus when clicking the button
      e.preventDefault()
      onMouseDown?.(e)
    }}
    className={cn(
      'inline-flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-accent',
      'disabled:pointer-events-none disabled:opacity-50',
      active && 'bg-accent font-semibold',
      className,
    )}
    {...props}
  />
))
ToolbarButton.displayName = 'ToolbarButton'
