const DEBUG = false

export const debug = (...args: unknown[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}
