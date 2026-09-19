import React from 'react'
import { SurveyParticipant } from 'veysur-common'

import type { usePagination, useSelection } from 'hook'
import { DataTable } from 'component/DataTable'
import type { ColumnDefinition } from 'component/DataTable'
import { Pagination } from 'component/Pagination'

interface ParticipantListViewProps {
  participants: SurveyParticipant[]
  columns: ColumnDefinition<SurveyParticipant>[]
  participantCount: number
  pagination: ReturnType<typeof usePagination>
  selection: ReturnType<typeof useSelection>
  onRowClick: (participant: SurveyParticipant) => void
  isLoading: boolean
  isFetching: boolean
}

export const ParticipantListView: React.FC<ParticipantListViewProps> = ({
  participants,
  columns,
  participantCount,
  pagination,
  selection,
  onRowClick,
  isLoading,
  isFetching,
}) => {
  return (
    <>
      <DataTable
        data={participants}
        columns={columns}
        getRowId={(participant) => participant._id}
        enableSelection
        selection={selection}
        onRowClick={onRowClick}
        isLoading={isLoading}
        isFetching={isFetching}
        containerClassName="border-0 rounded-none"
      />
      <Pagination total={participantCount} pagination={pagination} />
    </>
  )
}
