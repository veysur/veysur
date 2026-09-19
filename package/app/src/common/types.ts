// type MyClassPropertiesFromConstructor = PropsOf<typeof MyClass>;
// type MyClassPropertiesFromInstance = PropsOf<MyClass>;
export type PropsOf<T> = T extends new (...args: unknown[]) => unknown
  ? Omit<
      InstanceType<T>,
      {
        [K in keyof InstanceType<T>]: InstanceType<T>[K] extends (
          ...args: never[]
        ) => unknown
          ? K
          : never
      }[keyof InstanceType<T>]
    >
  : Omit<
      T,
      {
        [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never
      }[keyof T]
    >
