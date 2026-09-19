export type WithPrivates<S, O> = Omit<S, keyof O> & O

export function asPrivate<S, O extends Record<string, unknown>>(
  service: S,
): WithPrivates<S, O> {
  return service as unknown as WithPrivates<S, O>
}
