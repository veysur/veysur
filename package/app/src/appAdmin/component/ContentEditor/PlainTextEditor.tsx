import React, { useEffect, useRef } from 'react'

import { cn } from 'common/cn'

interface PlainTextEditorProps {
  className?: string
  disabled?: boolean
  focus?: boolean
  placeholder?: string
  testId?: string
  value?: string
  variant?: 'inline' | 'styled'
  onBlur?: (e?: Event) => void
  onClick?: (e?: Event) => void
  onFocus?: (e?: Event) => void
  onChange?: (content: string) => void
}

// Fast-path text control used by ContentEditor when `format="plain"` - no
// TipTap instance is created at all (a hidden-toolbar TipTap would still let
// TipTap's own keyboard shortcuts apply rich formatting, defeating the point
// of plain-text mode).
export const PlainTextEditor: React.FC<PlainTextEditorProps> = ({
  className,
  disabled = false,
  focus,
  placeholder,
  testId,
  value = '',
  variant = 'styled',
  onBlur = () => {},
  onClick = () => {},
  onFocus = () => {},
  onChange = () => {},
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (focus) {
      textareaRef.current?.focus()
    }
  }, [focus])

  return (
    <div
      className={cn(
        'w-full',
        variant === 'styled' &&
          'rounded-md border border-input bg-transparent dark:bg-input/30 px-3 py-2 text-base shadow-xs transition-[color,box-shadow] md:text-sm',
        className,
        variant === 'styled' &&
          !disabled &&
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        variant === 'styled' &&
          disabled &&
          'pointer-events-none cursor-not-allowed opacity-50',
      )}
    >
      <textarea
        ref={textareaRef}
        className="w-full resize-none bg-transparent outline-none"
        rows={variant === 'styled' ? 3 : 1}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onBlur()}
        onFocus={() => onFocus()}
        onClick={() => onClick()}
      />
    </div>
  )
}
