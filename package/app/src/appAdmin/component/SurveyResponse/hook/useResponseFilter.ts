import { useState } from 'react'

export interface Publication {
  _id: string
  snapshotId: string
}

export interface UseResponseFilterProps {
  publications: Publication[]
}

export interface UseResponseFilterReturn {
  selectedPublicationId: string
  setSelectedPublicationId: (id: string) => void
  getSnapshotIdForData: () => string
}

export const useResponseFilter = ({
  publications,
}: UseResponseFilterProps): UseResponseFilterReturn => {
  const [selectedPublicationId, setSelectedPublicationId] = useState<string>('')

  // Falls back to the first publication until the caller explicitly selects
  // one — no need to materialise this into state via an effect.
  const actualSelectedPublicationId =
    selectedPublicationId || publications[0]?._id || ''

  const getSnapshotIdForData = (): string => {
    return (
      publications.find((p) => p._id === actualSelectedPublicationId)
        ?.snapshotId || ''
    )
  }

  return {
    selectedPublicationId: actualSelectedPublicationId,
    setSelectedPublicationId,
    getSnapshotIdForData,
  }
}
