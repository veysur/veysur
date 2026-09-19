import { queryClient } from 'common/queryClient'
import { KEY_STATE_REDIRECT_PENDING } from 'common/keyState'

type RedirectEntry = { id: string; path: string }

queryClient.setQueryDefaults([KEY_STATE_REDIRECT_PENDING], {
  staleTime: Infinity,
  meta: { persistence: { storageType: 'session' } },
})

const getStack = (): RedirectEntry[] =>
  queryClient.getQueryData<RedirectEntry[]>([KEY_STATE_REDIRECT_PENDING]) ?? []

export const RedirectPending = {
  push(id: string, path: string): void {
    const stack = getStack().filter((e) => e.id !== id)
    queryClient.setQueryData(
      [KEY_STATE_REDIRECT_PENDING],
      [...stack, { id, path }],
    )
  },
  remove(id: string): string | null {
    const stack = getStack()
    const index = stack.findIndex((e) => e.id === id)
    if (index === -1) return null
    const entry = stack[index]
    queryClient.setQueryData(
      [KEY_STATE_REDIRECT_PENDING],
      [...stack.slice(0, index), ...stack.slice(index + 1)],
    )
    return entry.path
  },
}
