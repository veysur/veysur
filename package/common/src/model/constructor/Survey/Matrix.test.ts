import type {
  MatrixCellType,
  MatrixCellValue,
  MatrixResponseData,
} from './Matrix'

describe('Matrix types', () => {
  describe('MatrixCellType', () => {
    test('accepts valid cell type values', () => {
      const a: MatrixCellType = 'number'
      const b: MatrixCellType = 'string'
      const c: MatrixCellType = 'boolean'
      expect(a).toBe('number')
      expect(b).toBe('string')
      expect(c).toBe('boolean')
    })
  })

  describe('MatrixCellValue', () => {
    test('accepts number, string, and boolean values', () => {
      const a: MatrixCellValue = 42
      const b: MatrixCellValue = 'Washington, D.C.'
      const c: MatrixCellValue = true
      expect(a).toBe(42)
      expect(b).toBe('Washington, D.C.')
      expect(c).toBe(true)
    })
  })

  describe('MatrixResponseData', () => {
    test('accepts sparse grid data keyed by code pairs', () => {
      const data: MatrixResponseData = {
        A001: { S001: 21433, S003: 'Washington, D.C.', S004: false },
        A004: { S001: 2715, S004: true },
      }
      expect(data['A001']['S001']).toBe(21433)
      expect(data['A001']['S003']).toBe('Washington, D.C.')
      expect(data['A001']['S004']).toBe(false)
      expect(data['A004']['S001']).toBe(2715)
      expect(data['A004']['S004']).toBe(true)
    })

    test('accepts empty response data', () => {
      const data: MatrixResponseData = {}
      expect(data).toEqual({})
    })

    test('accepts partially filled rows', () => {
      const data: MatrixResponseData = {
        A001: { S001: 100 },
      }
      expect(data['A001']['S001']).toBe(100)
      expect(data['A001']['S002']).toBeUndefined()
    })
  })
})
