import { ServerErrorBadRequest } from 'mzen-server'

import { Registry } from 'model/common/Registry'

import { FormatHandlerInterface } from './FormatHandlerInterface'

/**
 * Registry for export/import format handlers
 *
 * Provides lookup by format name or file extension
 */
export class FormatRegistry extends Registry<FormatHandlerInterface> {
  constructor() {
    super({
      keyExtractor: (handler) => handler.format,
      errorMessagePrefix: 'Unsupported export format',
      itemTypeName: 'Format',
    })
  }

  /**
   * Get format handler by format name
   *
   * @param format - Format name (e.g., 'vsst')
   * @returns Format handler
   * @throws ServerErrorBadRequest if format not found
   */
  getByFormat(format: string): FormatHandlerInterface {
    return this.get(format)
  }

  /**
   * Get format handler by file extension
   *
   * @param filename - Filename with extension
   * @returns Format handler
   * @throws ServerErrorBadRequest if extension not recognized
   */
  getByExtension(filename: string): FormatHandlerInterface {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()

    for (const handler of this.getAll()) {
      if (handler.extensions.includes(ext)) {
        return handler
      }
    }

    throw new ServerErrorBadRequest({
      message: `Unsupported file extension: ${ext}`,
      filename,
      supportedExtensions: this.getSupportedExtensions(),
    })
  }

  /**
   * Get list of all supported extensions
   *
   * @returns Array of extensions (e.g., ['.vsst', '.json'])
   */
  private getSupportedExtensions(): string[] {
    const extensions: string[] = []
    for (const handler of this.getAll()) {
      extensions.push(...handler.extensions)
    }
    return extensions
  }
}
