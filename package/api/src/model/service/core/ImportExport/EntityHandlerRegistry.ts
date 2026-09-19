import { Registry } from 'model/common/Registry'

import { EntityHandlerInterface } from './EntityHandlerInterface'

/**
 * Registry for entity-specific import/export handlers
 *
 * Maintains a collection of handlers for different entity types
 * (surveys, participants, etc.) and provides lookup functionality
 */
export class EntityHandlerRegistry extends Registry<EntityHandlerInterface> {
  constructor() {
    super({
      keyExtractor: (handler) => handler.entityType,
      errorMessagePrefix: 'Unsupported entity type',
      itemTypeName: 'EntityType',
    })
  }

  /**
   * Get list of all supported entity types
   *
   * @returns Array of entity type identifiers
   */
  getSupportedEntityTypes(): string[] {
    return this.getSupportedKeys()
  }

  /**
   * Validate that an entity type supports a specific format
   *
   * @param entityType - Entity type
   * @param format - Format name
   * @returns true if the entity type supports the format
   * @throws ServerErrorBadRequest if entity type not supported
   */
  validateEntityFormat(entityType: string, format: string): boolean {
    const handler = this.get(entityType)
    return handler.getSupportedFormats().includes(format)
  }
}
