import { ExportOptions } from './FormatHandlerInterface'
import { TarGzFormatHandler } from './TarGzFormatHandler'
import { toIsoDateStamp } from './formatHandlerUtils'

export class VssaFormatHandler extends TarGzFormatHandler {
  format = 'vssa'
  extensions = ['.vssa']

  getFilename(
    _entityType: string,
    entityId: string,
    _options?: ExportOptions,
  ): string {
    const timestamp = toIsoDateStamp()
    return `survey-full-${entityId}-${timestamp}.vssa`
  }
}
