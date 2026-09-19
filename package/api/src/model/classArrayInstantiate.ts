export function classArrayInstantiate<T>(
  type: new () => T,
  classArray: Array<new () => T>,
): T[] {
  return classArray
    .map((className) =>
      typeof className == 'function' ? new className() : undefined,
    )
    .filter((instance) => !!instance || !(instance instanceof type))
}

export default classArrayInstantiate
