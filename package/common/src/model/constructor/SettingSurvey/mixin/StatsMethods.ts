import {
  ALL_CHART_TYPES,
  ALL_CHART_VALUE_MODES,
  ChartType,
  ChartValueMode,
} from '../SettingSurveyBase'
import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultStats = {
  questions: {} as Record<string, Record<string, unknown>>,
}

export function StatsMethods<T extends Constructor<SettingSurveyMixinBase>>(
  Base: T,
) {
  return class extends Base {
    setStatsQuestionProperty(
      questionCode: string,
      key: string,
      value: unknown,
    ): this {
      const currentStats = this.stats || defaultStats
      const currentQuestions = currentStats.questions || {}
      const currentQuestion = currentQuestions[questionCode] || {}
      const newQuestion = { ...currentQuestion, [key]: value }

      // Check if value actually changed
      if (currentQuestion[key] === value) {
        return this
      }

      return this.newInstance({
        stats: {
          ...currentStats,
          questions: {
            ...currentQuestions,
            [questionCode]: newQuestion,
          },
        },
      })
    }

    updateStatsQuestion(
      questionCode: string,
      updates: Record<string, unknown>,
    ): this {
      const currentStats = this.stats || defaultStats
      const currentQuestions = currentStats.questions || {}
      const currentQuestion = currentQuestions[questionCode] || {}
      const newQuestion = { ...currentQuestion, ...updates }

      // Check if any values changed
      const hasChanges = Object.keys(updates).some(
        (key) => currentQuestion[key] !== updates[key],
      )

      if (!hasChanges) {
        return this
      }

      return this.newInstance({
        stats: {
          ...currentStats,
          questions: {
            ...currentQuestions,
            [questionCode]: newQuestion,
          },
        },
      })
    }

    setStatsQuestionChartType(
      questionCode: string,
      chartType: ChartType,
    ): this {
      if (!ALL_CHART_TYPES.includes(chartType)) {
        return this
      }
      return this.setStatsQuestionProperty(questionCode, 'chartType', chartType)
    }

    setStatsQuestionValueMode(
      questionCode: string,
      valueMode: ChartValueMode,
    ): this {
      if (!ALL_CHART_VALUE_MODES.includes(valueMode)) {
        return this
      }
      return this.setStatsQuestionProperty(questionCode, 'valueMode', valueMode)
    }
  }
}
