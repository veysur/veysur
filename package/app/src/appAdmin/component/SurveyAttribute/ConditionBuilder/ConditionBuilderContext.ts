import { createContext, useContext } from 'react'
import { QuestionInfo } from 'veysur-common'

import {
  ParticipantAttributeOption,
  ResponseFieldOption,
} from './operandFormat'

export type ConditionBuilderContextValue = {
  questions: QuestionInfo[]
  participantAttributes: ParticipantAttributeOption[]
  responseFields: ResponseFieldOption[]
  languages: string[]
}

export const ConditionBuilderContext =
  createContext<ConditionBuilderContextValue>({
    questions: [],
    participantAttributes: [],
    responseFields: [],
    languages: [],
  })

export const useConditionBuilderContext = () =>
  useContext(ConditionBuilderContext)
