export type PatchType = string
export type PatchAction = 'create' | 'update' | 'delete' | string
export type PatchData = { [path: string]: unknown } | null
export type PatchId =
  string | number | Record<string, string | number> | undefined
export type Patch = {
  type: PatchType
  action: PatchAction
  data: PatchData
  id?: PatchId
}
export type PatchHandler = (
  patch: Patch,
  context: Record<string, unknown>,
) => Promise<void>

export const BUFFERED_PATCH_ACTION_CREATE: PatchAction = 'create'
export const BUFFERED_PATCH_ACTION_UPDATE: PatchAction = 'update'
export const BUFFERED_PATCH_ACTION_DELETE: PatchAction = 'delete'

export class Patcher {
  private handlers: Map<string, PatchHandler> = new Map()

  addHandler(type: string, action: string, callback: PatchHandler): void {
    this.handlers.set(this.getHandlerKey(type, action), callback)
  }

  getHandlerKey(type: string, action: string): string {
    return `${type}:${action}`
  }

  async applyPatch(
    patch: Patch,
    context: Record<string, unknown> = {},
  ): Promise<void> {
    const handlerKey = this.getHandlerKey(patch.type, patch.action)
    const handler = this.handlers.get(handlerKey)
    if (!handler) {
      throw new Error(`No patch handler found for handler key "${handlerKey}"`)
    }
    await handler(patch, context)
  }

  async applyAll(
    patches: Patch[],
    context: Record<string, unknown> = {},
  ): Promise<void> {
    for (const patch of patches) {
      await this.applyPatch(patch, context)
    }
  }
}

export default Patcher
