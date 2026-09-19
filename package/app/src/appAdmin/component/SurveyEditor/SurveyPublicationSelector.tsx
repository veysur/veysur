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
import { usePublicationList } from '../SurveyPublication/hook'

export interface SurveyPublicationSelectorProps {
  surveyId: string | undefined
  selectedPublicationId: string
  onPublicationChange: (publicationId: string) => void
  isFetching?: boolean
  showAllOption?: boolean
}

export const SurveyPublicationSelector: React.FC<
  SurveyPublicationSelectorProps
> = ({
  surveyId,
  selectedPublicationId,
  onPublicationChange,
  isFetching,
  showAllOption = false,
}) => {
  const tz = useDisplayTimezone()
  const { publications, isLoading: isPublicationsLoading } = usePublicationList(
    {
      surveyId,
      perPage: 100, // Get all publications
    },
  )

  if (!publications.length) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Label className="whitespace-nowrap m-0">Publication:</Label>
        <Select
          value={selectedPublicationId}
          onValueChange={onPublicationChange}
          disabled={isPublicationsLoading}
        >
          <SelectTrigger className="w-max-[400px]">
            <SelectValue placeholder="Select a publication" />
          </SelectTrigger>
          <SelectContent>
            {showAllOption && (
              <SelectItem value=" ">All Publications</SelectItem>
            )}
            {!selectedPublicationId && !showAllOption && (
              <SelectItem value=" ">Select a publication</SelectItem>
            )}
            {publications?.map((publication) => (
              <SelectItem key={publication._id} value={publication._id}>
                {formatDateTimeLong(publication.publishedAt, tz)}
                {publication.label ? ', ' + publication.label : ''}
                {publication.stoppedAt ? ' (Stopped)' : ' (Active)'}
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
