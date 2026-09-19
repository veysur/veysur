import { QUESTION_TYPE_YES_NO } from '../attributeMeta/types'
import { QuestionTypeDefinition } from './types'

export const yesNoDefinition: QuestionTypeDefinition = {
  type: QUESTION_TYPE_YES_NO,
  predefinedAnswerOptions: [
    { code: 'YES', label: 'Yes', value: true },
    { code: 'NO', label: 'No', value: false },
  ],
}
