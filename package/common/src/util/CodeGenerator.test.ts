import { CodeGenerator } from './CodeGenerator'

describe('CodeGenerator', () => {
  describe('getNextCode', () => {
    it('should return the first code when no codes exist', () => {
      const result = CodeGenerator.getNextCode('Q', [])
      expect(result).toBe('Q001')
    })

    it('should return the next sequential code', () => {
      const result = CodeGenerator.getNextCode('Q', ['Q001', 'Q002'])
      expect(result).toBe('Q003')
    })

    it('should handle non-sequential existing codes', () => {
      const result = CodeGenerator.getNextCode('Q', ['Q001', 'Q005'])
      expect(result).toBe('Q006')
    })

    it('should ignore codes with different prefixes', () => {
      const result = CodeGenerator.getNextCode('Q', [
        'Q001',
        'A002',
        'Q003',
        'A005',
      ])
      expect(result).toBe('Q004')
    })

    it('should find the lowest unused number when all up to 999 are used', () => {
      const existingCodes = Array.from(
        { length: 998 },
        (_, i) => `Q${(i + 1).toString().padStart(3, '0')}`,
      )
      existingCodes.push('Q999') // Add the last code
      existingCodes.splice(499, 1) // Remove Q500 to create a gap
      const result = CodeGenerator.getNextCode('Q', existingCodes)
      expect(result).toBe('Q500')
    })

    it('should return Q999 when all numbers are used', () => {
      const existingCodes = Array.from(
        { length: 999 },
        (_, i) => `Q${(i + 1).toString().padStart(3, '0')}`,
      )
      const result = CodeGenerator.getNextCode('Q', existingCodes)
      expect(result).toBe('Q999')
    })
  })
})
