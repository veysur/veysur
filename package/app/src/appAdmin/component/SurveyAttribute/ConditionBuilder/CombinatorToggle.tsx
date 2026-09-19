import { ConditionCombinator } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { ButtonGroup } from 'component/shadcn/button-group'

interface CombinatorToggleProps {
  value: ConditionCombinator
  onChange: (value: ConditionCombinator) => void
  disabled?: boolean
}

export function CombinatorToggle({
  value,
  onChange,
  disabled,
}: CombinatorToggleProps) {
  return (
    <ButtonGroup>
      <Button
        size="sm"
        variant={value === '&&' ? 'default' : 'outline'}
        onClick={() => onChange('&&')}
        disabled={disabled}
        className="h-7 px-2 text-xs"
      >
        AND
      </Button>
      <Button
        size="sm"
        variant={value === '||' ? 'default' : 'outline'}
        onClick={() => onChange('||')}
        disabled={disabled}
        className="h-7 px-2 text-xs"
      >
        OR
      </Button>
    </ButtonGroup>
  )
}
