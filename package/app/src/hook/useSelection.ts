import { useState, useCallback, useMemo } from 'react'

export interface UseSelectionReturn {
  selectedIds: Set<string>
  selectAll: boolean
  toggleSelection: (id: string) => void
  toggleSelectAll: (ids: string[]) => void
  clearSelection: () => void
  hasSelection: boolean
  getSelectionCount: () => number | 'all'
}

export const useSelection = (): UseSelectionReturn => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return newSelected
    })
    setSelectAll(false)
  }, [])

  const toggleSelectAll = useCallback(
    (ids: string[]) => {
      setSelectedIds((prev) => {
        if (selectAll || prev.size === ids.length) {
          setSelectAll(false)
          return new Set()
        } else {
          setSelectAll(true)
          return new Set(ids)
        }
      })
    },
    [selectAll],
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectAll(false)
  }, [])

  const hasSelection = selectAll || selectedIds.size > 0

  const getSelectionCount = useCallback(() => {
    if (selectAll) {
      return 'all'
    }
    return selectedIds.size
  }, [selectAll, selectedIds.size])

  return useMemo(
    () => ({
      selectedIds,
      selectAll,
      toggleSelection,
      toggleSelectAll,
      clearSelection,
      hasSelection,
      getSelectionCount,
    }),
    [
      selectedIds,
      selectAll,
      toggleSelection,
      toggleSelectAll,
      clearSelection,
      hasSelection,
      getSelectionCount,
    ],
  )
}
