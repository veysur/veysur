import React from 'react'
import { SurveyResponse } from 'veysur-common'
import { stripHtml } from 'common/stripHtml'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from 'component/shadcn/table'
import { Card } from 'component/shadcn/card'
import { UseSelectionReturn } from 'hook'
import { ColumnDefinition } from './hook/useResponseTableColumns'
import { ResponseTableRow } from './ResponseTableRow'

export interface ResponseTableProps {
  responses: SurveyResponse[]
  fixedLeftColumns: ColumnDefinition[]
  answerColumns: ColumnDefinition[]
  fixedRightColumns: ColumnDefinition[]
  selection: UseSelectionReturn
  onRowClick: (response: SurveyResponse) => void
  isFetching: boolean
}

export const ResponseTable: React.FC<ResponseTableProps> = ({
  responses,
  fixedLeftColumns,
  answerColumns,
  fixedRightColumns,
  selection,
  onRowClick,
  isFetching,
}) => {
  const scrollableRef = React.useRef<HTMLDivElement>(null)

  return (
    <Card className="p-0 relative overflow-hidden">
      {isFetching && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      )}
      <div className="flex min-w-0">
        {/* Fixed left columns */}
        <div className="flex-none border-r bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                {fixedLeftColumns.map((col) => (
                  <TableHead key={col.key} className={col.className}>
                    {col.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((aResponse) => (
                <ResponseTableRow
                  key={`left-${aResponse._id}`}
                  response={aResponse}
                  columns={fixedLeftColumns}
                  isSelected={
                    selection.selectAll ||
                    selection.selectedIds.has(aResponse._id)
                  }
                  onClick={onRowClick}
                  stopPropagationKeys={['select', 'actions']}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Scrollable answer columns */}
        <div ref={scrollableRef} className="flex-1 min-w-0">
          <Table>
            <TableHeader>
              <TableRow>
                {answerColumns.map((col: ColumnDefinition) => (
                  <TableHead key={col.key} className={col.className}>
                    <div
                      className="truncate"
                      title={stripHtml(String(col.title))}
                    >
                      {stripHtml(String(col.title))}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((aResponse) => (
                <ResponseTableRow
                  key={`answer-${aResponse._id}`}
                  response={aResponse}
                  columns={answerColumns}
                  isSelected={
                    selection.selectAll ||
                    selection.selectedIds.has(aResponse._id)
                  }
                  onClick={onRowClick}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Fixed right column */}
        <div className="flex-none border-l bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                {fixedRightColumns.map((col) => (
                  <TableHead key={col.key} className={col.className}>
                    {col.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((aResponse) => (
                <ResponseTableRow
                  key={`right-${aResponse._id}`}
                  response={aResponse}
                  columns={fixedRightColumns}
                  isSelected={
                    selection.selectAll ||
                    selection.selectedIds.has(aResponse._id)
                  }
                  stopPropagationKeys={['actions']}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  )
}
