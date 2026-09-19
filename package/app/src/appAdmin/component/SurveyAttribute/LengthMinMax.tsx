import { makeMinMaxAttribute } from './MinMaxAttribute'

export const LengthMinMax = makeMinMaxAttribute<number>({
  emptyValue: { min: 0, max: 0 },
  parse: (raw) => parseInt(raw),
  inputProps: { type: 'number', placeholder: '', min: '0' },
  errorLayout: 'stacked',
})
