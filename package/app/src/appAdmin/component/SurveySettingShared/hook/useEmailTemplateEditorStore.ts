import { create } from 'zustand'
import { PatchBuffer } from 'veysur-common'

export type EmailTemplateEditorStore = {
  patchBuffer?: PatchBuffer
  setPatchBuffer: (patchBuffer: PatchBuffer) => void
}

export const useEmailTemplateEditorStore = create<EmailTemplateEditorStore>(
  (set) => ({
    patchBuffer: undefined,
    setPatchBuffer: (patchBuffer) => set(() => ({ patchBuffer })),
  }),
)
