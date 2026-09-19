import { ExportOptions } from './FormatHandlerInterface'
import { TarGzFormatHandler } from './TarGzFormatHandler'
import { toIsoDateStamp } from './formatHandlerUtils'

export class VsstFormatHandler extends TarGzFormatHandler {
  format = 'vsst'
  extensions = ['.vsst']

  getFilename(
    entityType: string,
    entityId: string,
    _options?: ExportOptions,
  ): string {
    const timestamp = toIsoDateStamp()
    return `${entityType}-${entityId}-${timestamp}.vsst`
  }
}
