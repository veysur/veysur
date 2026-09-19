/**
 * A ratio as a percentage rounded to one decimal place, guarding against a
 * zero denominator. Shared by every stats aggregator so the rounding is
 * spelled one way.
 */
export const percentOf = (count: number, total: number): number =>
  total > 0 ? Math.round((count / total) * 1000) / 10 : 0
