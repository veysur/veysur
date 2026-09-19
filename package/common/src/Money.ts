export interface MoneyFormatOptions {
  showSymbol?: boolean
  showPositiveSymbol?: boolean
  zeroIsFree?: boolean
  symbol?: string
}

export class Money {
  static format(pence: number, options?: MoneyFormatOptions) {
    const defaultOptions = {
      showSymbol: false,
      showPositiveSymbol: false, // £+10.00 or +10.00 - useful when showing positive and negative values together
      zeroIsFree: false,
      symbol: '£',
    }
    options = options ? { ...defaultOptions, ...options } : defaultOptions

    const resultNumber = Math.round(pence) / 100
    const resultString = resultNumber.toFixed(2)

    const symbol = options.showSymbol ? options.symbol : ''
    const positiveSymbol =
      options.showPositiveSymbol && resultNumber > 0 ? '+' : ''
    const prefix = symbol + positiveSymbol

    const isFree = resultNumber == 0 && options.zeroIsFree

    return isFree ? 'Free' : prefix + resultString
  }

  static displayFormat(pence: number, options?: MoneyFormatOptions) {
    return Money.format(pence, { showSymbol: true, ...options })
  }

  static displayFormatPrice(pence: number, options?: MoneyFormatOptions) {
    return Money.displayFormat(pence, { zeroIsFree: true, ...options })
  }

  static getFormatter(options?: MoneyFormatOptions) {
    return (pence: number) => {
      return Money.format(pence, options)
    }
  }

  static formatCurrency(
    cents: number,
    locale: string = 'en-GB',
    currency: string = 'GBP',
  ): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(cents / 100)
  }
}

export default Money
