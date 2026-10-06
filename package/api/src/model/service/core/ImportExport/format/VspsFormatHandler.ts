import { ExportOptions } from './FormatHandlerInterface'
import { TarGzFormatHandler } from './TarGzFormatHandler'
import { toIsoDateStamp } from './formatHandlerUtils'

export class VspsFormatHandler extends TarGzFormatHandler {
  format = 'vsps'
  extensions = ['.vsps']

  getFilename(
    entityType: string,
    entityId: string,
    _options?: ExportOptions,
  ): string {
    const timestamp = toIsoDateStamp()
    return `${entityType}-${entityId}-${timestamp}.vsps`
  }
}
