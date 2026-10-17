export function createPowWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  return new Worker(new URL('./powWorker.ts', import.meta.url), {
    type: 'module',
  })
}
