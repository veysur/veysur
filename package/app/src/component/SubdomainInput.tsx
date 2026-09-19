import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

import { Input } from 'component/shadcn/input'
import { FieldError } from 'component/Form'

type Props = {
  id?: string
  value: string
  error?: string
  isValidating?: boolean
  disabled?: boolean
  appDomain: string
  successMessage?: React.ReactNode
} & Omit<
  React.ComponentProps<typeof Input>,
  'id' | 'value' | 'disabled' | 'className' | 'style'
>

export const SubdomainInput: React.FC<Props> = ({
  id,
  value,
  error,
  isValidating,
  disabled,
  appDomain,
  successMessage,
  ...inputProps
}) => {
  const renderValidationIcon = () => {
    if (!value || value.trim() === '') return null
    if (isValidating) {
      return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    }
    if (error) return <XCircle className="h-5 w-5 text-destructive" />
    return <CheckCircle2 className="h-5 w-5 text-green-600" />
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-1">
        <Input
          id={id}
          type="text"
          placeholder="my-project"
          autoComplete="do-not-autofill"
          data-lpignore="true"
          data-form-type="other"
          disabled={disabled}
          className="w-auto text-right"
          style={{
            width: `${Math.max(12, (value || 'my-project').length + 2)}ch`,
          }}
          {...inputProps}
        />
        <span className="text-base font-semibold text-foreground whitespace-nowrap">
          .{appDomain}
        </span>
        {renderValidationIcon()}
      </div>
      {error && <FieldError className="mt-1">{error}</FieldError>}
      {value && !error && !isValidating && successMessage}
    </div>
  )
}
