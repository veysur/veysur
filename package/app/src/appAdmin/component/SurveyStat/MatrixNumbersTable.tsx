import React from 'react'

import type { QuestionStats } from './model/api/SurveyStatsApi'
import { StatNumbersTable } from './chartComponents'
import { matrixCellText } from './matrixChartUtils'

interface Props {
  questionStat: QuestionStats
  answerOptionCodes: string[]
  isNumeric: boolean
  isYesNo: boolean
  optionLabel: (optionCode: string) => string
  subquestionLabel: (
    subquestionCode: string,
    subquestionText?: { [lang: string]: string },
  ) => string
}

/**
 * The matrix stats numbers table, shown under every chart type. One row per
 * subquestion, one column per answer option; cell text comes from
 * `matrixCellText`.
 */
export const MatrixNumbersTable: React.FC<Props> = ({
  questionStat,
  answerOptionCodes,
  isNumeric,
  isYesNo,
  optionLabel,
  subquestionLabel,
}) => {
  const subquestionStats = questionStat.matrixSubquestionStats || []
  return (
    <StatNumbersTable>
      <thead>
        <tr>
          <td className="p-1" />
          {answerOptionCodes.map((optionCode) => (
            <td key={optionCode} className="p-1 text-left whitespace-nowrap">
              {optionLabel(optionCode)}
            </td>
          ))}
        </tr>
      </thead>
      <tbody>
        {subquestionStats.map((subquestion) => (
          <tr key={subquestion.subquestionCode} className="border-t">
            <td className="p-1 whitespace-nowrap">
              {subquestionLabel(
                subquestion.subquestionCode,
                subquestion.subquestionText,
              )}
            </td>
            {subquestion.cellStats.map((cell) => (
              <td key={cell.optionCode} className="p-1 text-center">
                {matrixCellText(cell, questionStat, { isNumeric, isYesNo })}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </StatNumbersTable>
  )
}
