// cspell:ignore bwignore
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'

export interface IdFilterInputProps {
  label: string
  paramKey: string
  value: string | undefined
  placeholder?: string
  onChange: (key: string, value: string) => void
}

/** A labelled free-text ID filter input, e.g. Project ID / User ID on list pages. */
export const IdFilterInput: React.FC<IdFilterInputProps> = ({
  label,
  paramKey,
  value,
  placeholder = label,
  onChange,
}) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input
      value={value ?? ''}
      onChange={(e) => onChange(paramKey, e.target.value)}
      placeholder={placeholder}
      className="h-8 pr-6 text-sm"
      data-1p-ignore="true"
      data-bwignore="true"
    />
  </div>
)
