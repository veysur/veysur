export class CodeGenerator {
  static getNextCode(prefix: string, existingCodes: string[]): string {
    const numbers = existingCodes
      .filter((code) => code && code.startsWith(prefix))
      .map((code) => parseInt(code.slice(prefix.length), 10))
      .filter((num) => !isNaN(num))
      .sort((a, b) => a - b)

    let nextNumber
    if (numbers.length === 0) {
      nextNumber = 1
    } else {
      nextNumber = Math.max(...numbers) + 1
    }

    if (nextNumber > 999) {
      // Find the lowest unused number
      nextNumber = 1
      while (numbers.includes(nextNumber) && nextNumber <= 999) {
        nextNumber++
      }
    }

    // If all numbers are used, use 999
    if (nextNumber > 999) {
      nextNumber = 999
    }

    return prefix + nextNumber.toString().padStart(3, '0')
  }
}
