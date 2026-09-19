import { create } from 'zustand'

type VersionMismatchState = {
  mismatch: boolean
  setMismatch: (value: boolean) => void
}

export const versionMismatchStore = create<VersionMismatchState>((set) => ({
  mismatch: false,
  setMismatch: (value) => set({ mismatch: value }),
}))
