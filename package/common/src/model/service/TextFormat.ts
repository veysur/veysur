import {
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min'
import safeRegex from 'safe-regex2'

export const TEXT_FORMAT_NONE = 'none'
export const TEXT_FORMAT_EMAIL = 'email'
export const TEXT_FORMAT_PHONE = 'phone'
export const TEXT_FORMAT_URL = 'url'
export const TEXT_FORMAT_CUSTOM = 'custom'

export const TEXT_FORMATS = [
  TEXT_FORMAT_NONE,
  TEXT_FORMAT_EMAIL,
  TEXT_FORMAT_PHONE,
  TEXT_FORMAT_URL,
  TEXT_FORMAT_CUSTOM,
] as const

export type TextFormat = (typeof TEXT_FORMATS)[number]

export const TEXT_FORMAT_PATTERN_MAX_LENGTH = 200
export const TEXT_FORMAT_CUSTOM_VALUE_MAX_LENGTH = 1000

export interface TextFormatConfig {
  format?: string
  /** Comma-separated ISO 3166 alpha-2 codes; empty means any country. */
  countries?: string
  pattern?: string
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value)
}

export function isValidUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export function parseTextFormatCountries(countries?: string): CountryCode[] {
  return (countries || '')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean) as CountryCode[]
}

function callingCodeOf(country: CountryCode): string | undefined {
  try {
    return getCountryCallingCode(country)
  } catch {
    return undefined
  }
}

/**
 * With no countries the number must be international (leading `+`). With
 * countries, national format is read against each listed country. Matching is
 * on calling code, not the resolved country, because ranges are shared (a
 * `+44 7911` mobile resolves to Guernsey even for a GB number).
 */
export function isValidPhone(value: string, countries?: string): boolean {
  const listed = parseTextFormatCountries(countries)
  if (!listed.length) {
    return (
      value.trim().startsWith('+') &&
      !!parsePhoneNumberFromString(value)?.isValid()
    )
  }
  const allowedCodes = new Set(listed.map(callingCodeOf).filter(Boolean))
  return listed.some((country) => {
    const number = parsePhoneNumberFromString(value, country)
    return !!number?.isValid() && allowedCodes.has(number.countryCallingCode)
  })
}

/** Rejects patterns that do not compile or risk catastrophic backtracking. */
export function isSafeRegexPattern(pattern: string): boolean {
  if (!pattern || pattern.length > TEXT_FORMAT_PATTERN_MAX_LENGTH) return false
  try {
    new RegExp(pattern)
  } catch {
    return false
  }
  return safeRegex(pattern)
}

function isValidCustom(value: string, pattern?: string): boolean {
  if (!pattern || !isSafeRegexPattern(pattern)) return true
  if (value.length > TEXT_FORMAT_CUSTOM_VALUE_MAX_LENGTH) return false
  return new RegExp(`^(?:${pattern})$`).test(value)
}

/**
 * True when the value satisfies the configured format. Empty values pass
 * (`required` handles those), as does a custom format with an unusable
 * pattern, which is skipped rather than run.
 */
export function validateTextFormat(
  value: unknown,
  config: TextFormatConfig,
): boolean {
  if (typeof value !== 'string' || value.trim() === '') return true
  const text = value.trim()
  switch (config.format) {
    case TEXT_FORMAT_EMAIL:
      return isValidEmail(text)
    case TEXT_FORMAT_URL:
      return isValidUrl(text)
    case TEXT_FORMAT_PHONE:
      return isValidPhone(text, config.countries)
    case TEXT_FORMAT_CUSTOM:
      return isValidCustom(value, config.pattern)
    default:
      return true
  }
}
