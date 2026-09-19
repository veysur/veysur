import { useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react'

import { cn } from 'common/cn'

type Props = {
  value: string
  onChange: (value: string) => void
  onComplete?: () => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
}

export const OtpInput: React.FC<Props> = ({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const focusAt = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(index, length - 1))]?.focus()
  }

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) return
    const digit = raw[raw.length - 1]
    const next = [...digits]
    next[index] = digit
    const newValue = next.join('')
    onChange(newValue)
    if (index === length - 1) {
      onComplete?.()
    } else {
      focusAt(index + 1)
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        onChange(next.join(''))
      } else {
        focusAt(index - 1)
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusAt(index - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusAt(index + 1)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, length)
    onChange(pasted)
    if (pasted.length === length) {
      onComplete?.()
    } else {
      focusAt(Math.min(pasted.length, length - 1))
    }
  }

  return (
    <div className="flex w-full gap-1.5 justify-center sm:gap-2.5">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digits[i]}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-14 w-full min-w-0 max-w-11 flex-1 rounded-lg border-2 bg-background text-center font-mono text-xl font-semibold',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary/20',
            digits[i]
              ? 'border-primary/60 text-foreground'
              : 'border-input text-foreground',
            'focus:border-primary',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        />
      ))}
    </div>
  )
}

export default OtpInput
