import { Label } from 'component/shadcn/label'
import { Input } from 'component/shadcn/input'
import { FieldError } from 'component/Form'
import {
  ChangeEventHandler,
  AttributeConfig,
} from '../SurveyAttributesPanel/attributesConfig'
import { useValidatedInternalValue } from './useValidatedInternalValue'

type MinMax<T> = { min: T; max: T }

export type MinMaxAttributeVariant<T> = {
  emptyValue: MinMax<T>
  parse: (raw: string) => T
  inputProps: Partial<React.ComponentProps<typeof Input>>
  // 'inline' renders each field's error directly under that field.
  // 'stacked' renders both errors together below the grid.
  errorLayout: 'inline' | 'stacked'
}

export function makeMinMaxAttribute<T>(
  variant: MinMaxAttributeVariant<T>,
): AttributeConfig['component'] {
  return function MinMaxAttribute({
    config,
    isValid,
    errors,
    value,
    onChange,
  }) {
    const computeValue = () =>
      (value?.min !== undefined && value?.max !== undefined && value) ||
      config.initialValue ||
      variant.emptyValue
    const [valueInternal, setValueInternal] = useValidatedInternalValue(
      value,
      isValid,
      computeValue,
    )
    const handleChange = (next: MinMax<T>) => {
      setValueInternal(next)
      onChange(next)
    }
    const handleChangeMin = (e: ChangeEventHandler) => {
      const min =
        e.target.value === ''
          ? variant.parse('0')
          : variant.parse(e.target.value)
      handleChange({ ...valueInternal, min })
    }
    const handleChangeMax = (e: ChangeEventHandler) => {
      const max =
        e.target.value === ''
          ? variant.parse('0')
          : variant.parse(e.target.value)
      handleChange({ ...valueInternal, max })
    }
    // 0 means "no limit" on either bound for these attributes — show the
    // placeholder instead of a literal 0 so the field reads as unset rather
    // than zero-selectable. Real survey data always stores this as a Number
    // regardless of the input's own value type (e.g. NumberMinMax uses
    // strings while typing), so compare numerically rather than against
    // variant.emptyValue.
    const minDisplayValue =
      Number(valueInternal.min) === 0 ? '' : valueInternal.min
    const maxDisplayValue =
      Number(valueInternal.max) === 0 ? '' : valueInternal.max
    const errorsMin =
      !!errors &&
      !!errors[config.name + '.min'] &&
      errors[config.name + '.min'].join(',')
    const errorsMax =
      !!errors &&
      !!errors[config.name + '.max'] &&
      errors[config.name + '.max'].join(',')
    const errorMin = !isValid && errorsMin && (
      <FieldError className="mt-1">{errorsMin}</FieldError>
    )
    const errorMax = !isValid && errorsMax && (
      <FieldError className="mt-1">{errorsMax}</FieldError>
    )
    return (
      <div className="mb-4">
        <Label className="mb-2">{config.name}</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1">Min</Label>
            <Input
              {...variant.inputProps}
              placeholder="no min"
              onChange={handleChangeMin}
              value={minDisplayValue}
              className={!isValid && !!errorsMin ? 'border-destructive' : ''}
            />
            {variant.errorLayout === 'inline' && errorMin}
          </div>
          <div>
            <Label className="mb-1">Max</Label>
            <Input
              {...variant.inputProps}
              placeholder="no max"
              onChange={handleChangeMax}
              value={maxDisplayValue}
              className={!isValid && !!errorsMax ? 'border-destructive' : ''}
            />
            {variant.errorLayout === 'inline' && errorMax}
          </div>
        </div>
        {variant.errorLayout === 'stacked' && (
          <>
            {errorMin}
            {errorMax}
          </>
        )}
      </div>
    )
  }
}
