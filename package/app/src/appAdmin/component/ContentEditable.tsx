import React, { useCallback, useEffect, useRef } from 'react'

interface ContentEditableProps {
  disabled?: boolean
  id?: string
  testId?: string
  value?: string
  plaintext?: boolean
  placeholder?: string
  onBlur?: () => void
  onClick?: (e?: Event) => void
  onFocus?: () => void
  onChange?: (content: string) => void
}

export const ContentEditable: React.FC<ContentEditableProps> = ({
  disabled = false,
  id,
  testId,
  value = '',
  plaintext = false,
  placeholder,
  onBlur = () => {},
  onClick = () => {},
  onFocus = () => {},
  onChange = () => {},
}) => {
  const divRef = useRef<HTMLDivElement>(null)

  // Sync content from props only when value changes and element is not focused
  useEffect(() => {
    const element = divRef.current
    if (!element) return

    if (document.activeElement === element) return

    if (element.innerHTML !== value) {
      element.innerHTML = value
    }
  }, [value])

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const content = plaintext
        ? e.currentTarget.textContent || ''
        : e.currentTarget.innerHTML
      onChange(content)
    },
    [onChange, plaintext],
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const content = plaintext
        ? e.currentTarget.textContent || ''
        : e.currentTarget.innerHTML
      if (content !== value) {
        onChange(content)
      }
      onBlur()
    },
    [onBlur, onChange, plaintext, value],
  )

  const handleFocus = useCallback(() => {
    onFocus()
  }, [onFocus])

  const isEmpty = !value || value.trim() === ''
  const showPlaceholder = isEmpty && placeholder

  return (
    <div className="relative w-full">
      {showPlaceholder && (
        <div
          className="absolute inset-0 pointer-events-none text-gray-400"
          style={{ minHeight: '1em' }}
        >
          {placeholder}
        </div>
      )}
      <div
        ref={divRef}
        id={id}
        contentEditable={
          !disabled ? (plaintext ? 'plaintext-only' : true) : false
        }
        data-testid={testId}
        onInput={handleInput}
        onBlur={handleBlur}
        onClick={(e) => onClick(e.nativeEvent)}
        onFocus={handleFocus}
        className="block w-full p-0 focus:outline-none focus:ring-0 relative"
        style={{
          color: 'inherit',
          backgroundColor: 'transparent',
          minHeight: '1em',
        }}
        suppressContentEditableWarning
      />
    </div>
  )
}
