import { NUMERIC_TEXT_INPUT_PROPS } from 'component/constant'

import { makeMinMaxAttribute } from './MinMaxAttribute'

// This difference between NumberMinMax and LengthMinMax is that NumberMinMax allows negative numbers
export const NumberMinMax = makeMinMaxAttribute<string>({
  emptyValue: { min: '0', max: '0' },
  parse: (raw) => raw,
  inputProps: { ...NUMERIC_TEXT_INPUT_PROPS, placeholder: '' },
  errorLayout: 'inline',
})
