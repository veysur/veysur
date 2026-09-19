import { ExportOptions } from './FormatHandlerInterface'
import { TarGzFormatHandler } from './TarGzFormatHandler'
import { toIsoDateStamp } from './formatHandlerUtils'

export class VsspFormatHandler extends TarGzFormatHandler {
  format = 'vssp'
  extensions = ['.vssp']

  getFilename(
    _entityType: string,
    entityId: string,
    _options?: ExportOptions,
  ): string {
    const timestamp = toIsoDateStamp()
    return `${entityId}-${timestamp}.vssp`
  }
}
