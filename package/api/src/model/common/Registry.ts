import { ServerErrorBadRequest } from '@datacapy/server'

/**
 * Base type for items that can be registered
 */
export type RegistryItem = object

/**
 * Configuration for Registry
 * @template T - Type of items stored in the registry
 */
export interface RegistryConfig<T extends RegistryItem> {
  /** Function to extract the registry key from an item */
  keyExtractor: (item: T) => string
  /** Error message prefix when item not found */
  errorMessagePrefix: string
  /** Name of the item type (used in error messages) */
  itemTypeName: string
}

/**
 * Generic base class for registry pattern
 *
 * Provides common Map-based storage with register, get, has methods
 * and consistent error handling for missing items.
 *
 * @template T - Type of items stored in the registry (must extend RegistryItem)
 *
 * @example
 * ```typescript
 * export class EntityHandlerRegistry extends Registry<EntityHandlerInterface> {
 *   constructor() {
 *     super({
 *       keyExtractor: (handler) => handler.entityType,
 *       errorMessagePrefix: 'Unsupported entity type',
 *       itemTypeName: 'EntityType',
 *     })
 *   }
 * }
 * ```
 */
export abstract class Registry<T extends RegistryItem> {
  protected items: Map<string, T> = new Map()
  protected config: RegistryConfig<T>

  constructor(config: RegistryConfig<T>) {
    this.config = config
  }

  /**
   * Register an item in the registry
   *
   * @param item - Item to register
   */
  register(item: T): void {
    const key = this.config.keyExtractor(item)
    this.items.set(key, item)
  }

  /**
   * Get item by key
   *
   * @param key - Registry key
   * @returns The registered item
   * @throws ServerErrorBadRequest if key not found
   */
  get(key: string): T {
    const item = this.items.get(key)
    if (!item) {
      throw new ServerErrorBadRequest({
        message: `${this.config.errorMessagePrefix}: ${key}`,
        [`supported${this.config.itemTypeName}s`]: this.getSupportedKeys(),
      })
    }
    return item
  }

  /**
   * Check if key is registered
   *
   * @param key - Registry key to check
   * @returns true if registered
   */
  has(key: string): boolean {
    return this.items.has(key)
  }

  /**
   * Get list of all supported keys
   *
   * @returns Array of registry keys
   */
  getSupportedKeys(): string[] {
    return Array.from(this.items.keys())
  }

  /**
   * Get all registered items
   * Protected - subclasses can expose if needed
   *
   * @returns Array of all items
   */
  protected getAll(): T[] {
    return Array.from(this.items.values())
  }
}
