import React from 'react'

import { QuestionTypeProps } from '../QuestionTypeProps'
import { MultipleChoicePointScale } from './MultipleChoicePointScale'

export interface MultipleChoicePoint5Props extends QuestionTypeProps {
  hideLabels?: boolean
}

export const MultipleChoicePoint5: React.FC<MultipleChoicePoint5Props> = (
  props,
) => {
  return <MultipleChoicePointScale {...props} pointCount={5} />
}
