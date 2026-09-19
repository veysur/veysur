import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultPresentation = {
  format: 'group' as 'group' | 'question' | 'all',
  noAnswer: true,
  title: true,
  welcomeMessage: false,
  progressBar: true,
  questionCount: true,
  groupName: false,
  groupDesc: false,
  questionNum: false,
  questionCode: false,
  questionIndex: false,
  backNav: false,
  redirectEnd: false,
  navDelay: 0,
  print: false,
  stats: false,
  noBrand: false,
  thankYouLink: false,
}

export function PresentationMethods<
  T extends Constructor<SettingSurveyMixinBase>,
>(Base: T) {
  return class extends Base {
    setPresentationProperty(key: string, value: unknown): this {
      return this.setNestedProperty(
        this.presentation,
        defaultPresentation,
        'presentation',
        key,
        value,
      )
    }

    updatePresentation(updates: Record<string, unknown>): this {
      return this.updateNestedProperty(
        this.presentation,
        defaultPresentation,
        'presentation',
        updates,
      )
    }
  }
}
