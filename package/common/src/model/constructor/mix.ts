import { Constructor } from '../type'

/**
 * Typed builder for the functional mixin pattern. Reads top to bottom in
 * application order, replacing a nested `C(B(A(Base)))` call:
 *
 *   mix(Base).with(A).with(B).with(C).base
 *
 * Each `with` checks the mixin's constraint against everything applied so
 * far, so an ordering mistake is a compile error at that line.
 */
export class Mix<T extends Constructor> {
  constructor(readonly base: T) {}

  with<R extends Constructor>(mixin: (base: T) => R): Mix<R> {
    return new Mix(mixin(this.base))
  }
}

export function mix<T extends Constructor>(base: T): Mix<T> {
  return new Mix(base)
}
