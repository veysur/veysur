/**
 * Mulberry32 — a fast, seedable PRNG that produces uniformly distributed values in [0, 1).
 * Returns a function that generates the next pseudo-random number on each call.
 */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Returns a new shuffled copy of items using a deterministic Fisher-Yates shuffle
 * driven by mulberry32(seed). The original array is never mutated.
 * The same seed always produces the same permutation of the same input array.
 */
export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const result = [...items]
  const rand = mulberry32(seed)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
