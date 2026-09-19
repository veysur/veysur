import React from 'react'
import { SurveyResponse } from 'veysur-common'
import { cn } from 'common/cn'
import { TableRow, TableCell } from 'component/shadcn/table'
import { ColumnDefinition } from './hook/useResponseTableColumns'

export interface ResponseTableRowProps {
  response: SurveyResponse
  columns: ColumnDefinition[]
  isSelected: boolean
  onClick?: (response: SurveyResponse) => void
  stopPropagationKeys?: string[]
}

export const ResponseTableRow: React.FC<ResponseTableRowProps> = ({
  response,
  columns,
  isSelected,
  onClick,
  stopPropagationKeys = [],
}) => {
  return (
    <TableRow
      onClick={onClick ? () => onClick(response) : undefined}
      className={cn([onClick && 'cursor-pointer', isSelected && 'bg-muted/70'])}
    >
      {columns.map((col) => (
        <TableCell
          key={`${col.key}-${response._id}`}
          className={cn('align-middle', col.className)}
          onClick={
            stopPropagationKeys.includes(col.key)
              ? (e) => e.stopPropagation()
              : undefined
          }
        >
          {col.key.startsWith('answer-') && !col.noTruncate ? (
            <div className="truncate" title={col.render(response) as string}>
              {col.render(response)}
            </div>
          ) : (
            col.render(response)
          )}
        </TableCell>
      ))}
    </TableRow>
  )
}
