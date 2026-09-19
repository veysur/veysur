import type { StatsResponse } from './types'

/**
 * Reads a single part value out of a response's answers, for the given
 * Multi-Part question code / part code. Multi-Part responses are flat
 * (`{ [partCode]: value }`), unlike Matrix's nested cell shape.
 */
export function getMultiPartValue(
  response: StatsResponse,
  questionCode: string,
  partCode: string,
): unknown {
  const answer = response.answers[questionCode]
  return typeof answer === 'object' && answer !== null
    ? (answer as Record<string, unknown>)[partCode]
    : undefined
}
