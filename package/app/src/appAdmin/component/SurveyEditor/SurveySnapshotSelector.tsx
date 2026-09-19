import React from 'react'

import { formatDateTimeLong } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'
import { Label } from 'component/shadcn/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import { usePublishedPartialApiGet } from '../SurveyEditorPublish/hook'
import { useSurveySnapshotList } from '../SurveySnapshot/hook'

export interface SurveySnapshotSelectorProps {
  surveyId: string | undefined
  selectedSnapshotId: string
  onSnapshotChange: (snapshotId: string) => void
  isFetching?: boolean
  showAllOption?: boolean
  excludeSnapshotId?: string
}

export const SurveySnapshotSelector: React.FC<SurveySnapshotSelectorProps> = ({
  surveyId,
  selectedSnapshotId,
  onSnapshotChange,
  isFetching,
  showAllOption = false,
  excludeSnapshotId,
}) => {
  const tz = useDisplayTimezone()
  const { snapshot: publishedSnapshot } = usePublishedPartialApiGet({
    surveyId,
  })

  const { snapshots, isLoading: isSnapshotsLoading } = useSurveySnapshotList({
    surveyId,
  })

  if (!snapshots.length) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Label className="whitespace-nowrap m-0">Snapshot:</Label>
        <Select
          value={selectedSnapshotId}
          onValueChange={onSnapshotChange}
          disabled={isSnapshotsLoading}
        >
          <SelectTrigger className="w-max-[400px]">
            <SelectValue placeholder="Select a snapshot" />
          </SelectTrigger>
          <SelectContent>
            {showAllOption && <SelectItem value=" ">All Snapshots</SelectItem>}
            {!selectedSnapshotId && !showAllOption && (
              <SelectItem value=" ">Select a snapshot</SelectItem>
            )}
            {publishedSnapshot &&
              publishedSnapshot._id !== excludeSnapshotId && (
                <SelectItem value={publishedSnapshot._id}>
                  {formatDateTimeLong(publishedSnapshot.createdAt, tz)}
                  {publishedSnapshot.label
                    ? ', ' + publishedSnapshot.label
                    : ''}
                </SelectItem>
              )}
            {snapshots
              ?.filter(
                (s) =>
                  s._id &&
                  s._id !== publishedSnapshot?._id &&
                  s._id !== excludeSnapshotId,
              )
              ?.map((snapshot) => (
                <SelectItem key={snapshot._id} value={snapshot._id}>
                  {formatDateTimeLong(snapshot.createdAt, tz)}
                  {snapshot.label ? ', ' + snapshot.label : ''}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      {isFetching && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      )}
    </div>
  )
}
