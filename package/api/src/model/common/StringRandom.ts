const alphaUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const alphaLower = 'abcdefghijklmnopqrstuvwxyz'
const numeric = '0123456789'

export class StringRandom {
  static TYPE_ALPHA = 'alpha'
  static TYPE_ALPHA_NUMERIC = 'alpha_numeric'
  static TYPE_NUMERIC = 'numeric'
  static CASE_UPPER = 'upper'
  static CASE_LOWER = 'lower'

  static getCharactersAlpha(alphaCase?: string) {
    alphaCase = alphaCase ? alphaCase : undefined
    let result = ''
    switch (alphaCase) {
      case null:
        result = alphaUpper + alphaLower
        break
      case 'upper':
        result = alphaUpper
        break
      case 'lower':
        result = alphaLower
        break
    }
    return result
  }

  static getCharacters(type: string, alphaCase?: string) {
    let result = ''
    switch (type) {
      case 'alpha_numeric':
        result = StringRandom.getCharactersAlpha(alphaCase) + numeric
        break
      case 'alpha':
        result = StringRandom.getCharactersAlpha(alphaCase)
        break
      case 'numeric':
        result = numeric
        break
    }
    return result
  }

  static gen(length?, type?: string, alphaCase?: string) {
    length = length ? length : 6
    const charArray: string[] = []
    const characters = this.getCharacters(
      type ? type : StringRandom.TYPE_ALPHA,
      alphaCase,
    )
    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
      charArray.push(
        characters.charAt(Math.floor(Math.random() * charactersLength)),
      )
    }
    return charArray.join('')
  }

  static genAlphaNumeric(length?, alphaCase?: string) {
    return this.gen(length, StringRandom.TYPE_ALPHA_NUMERIC, alphaCase)
  }

  static genAlphaNumericUpper(length?) {
    return this.gen(
      length,
      StringRandom.TYPE_ALPHA_NUMERIC,
      StringRandom.CASE_UPPER,
    )
  }

  static genAlphaNumericLower(length?) {
    return this.gen(
      length,
      StringRandom.TYPE_ALPHA_NUMERIC,
      StringRandom.CASE_LOWER,
    )
  }

  static genAlpha(length?, alphaCase?: string) {
    return this.gen(length, StringRandom.TYPE_ALPHA, alphaCase)
  }

  static genAlphaUpper(length?) {
    return this.gen(length, StringRandom.TYPE_ALPHA, StringRandom.CASE_UPPER)
  }

  static genAlphaLower(length?) {
    return this.gen(length, StringRandom.TYPE_ALPHA, StringRandom.CASE_LOWER)
  }

  static genNumeric(length?) {
    return this.gen(length, StringRandom.TYPE_NUMERIC)
  }
}

export default StringRandom
