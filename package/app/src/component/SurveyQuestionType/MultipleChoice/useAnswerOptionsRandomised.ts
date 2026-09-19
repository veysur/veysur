import { SurveyAnswerOption, SurveyQuestion } from 'veysur-common'

import { useRandomisationContext } from 'component/Survey/RandomisationContext'
import { useQuestionRandomisation } from 'component/Survey/hook/useQuestionRandomisation'

export function useAnswerOptionsRandomised(
  question: SurveyQuestion,
): SurveyAnswerOption[] {
  const { randomSeeds, onSeedRequired } = useRandomisationContext()

  return useQuestionRandomisation(
    question?.answerOptions || [],
    question?.code,
    Boolean(question?.attributes?.choiceRandomise),
    randomSeeds,
    onSeedRequired,
  )
}
