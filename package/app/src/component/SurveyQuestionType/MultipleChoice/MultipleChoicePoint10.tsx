import React from 'react'

import { QuestionTypeProps } from '../QuestionTypeProps'
import { MultipleChoicePointScale } from './MultipleChoicePointScale'

export interface MultipleChoicePoint10Props extends QuestionTypeProps {
  hideLabels?: boolean
}

export const MultipleChoicePoint10: React.FC<MultipleChoicePoint10Props> = (
  props,
) => {
  return <MultipleChoicePointScale {...props} pointCount={10} />
}
