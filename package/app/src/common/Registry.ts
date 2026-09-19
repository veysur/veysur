export class Registry {
  private static instance: Registry
  private storage: Map<string, unknown>

  private constructor() {
    this.storage = new Map()
  }

  public static getInstance(): Registry {
    if (!Registry.instance) {
      Registry.instance = new Registry()
    }
    return Registry.instance
  }

  public set<T>(key: string, value: T): void {
    this.storage.set(key, value)
  }

  public get<T>(key: string, factory: () => T): T {
    let value = this.storage.get(key) as T | undefined
    if (value === undefined) {
      value = factory()
      this.set(key, value)
    }
    return value
  }
}
