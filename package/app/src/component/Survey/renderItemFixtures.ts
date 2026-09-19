import {
  Survey,
  SurveyQuestion,
  SurveySection,
  SurveyContent,
} from 'veysur-common'

import type { QuestionWithGroup, SurveyRenderItem } from './SurveyTypes'

/**
 * Typed fixtures for the participant render list, so component tests build
 * `SurveyRenderItem`s from real model instances instead of
 * `{ ... } as unknown as SurveyRenderItem`.
 */

type QuestionOverrides = { _id?: string; code?: string; groupId?: string }

export function makeQuestionItem(
  overrides: QuestionOverrides = {},
): { kind: 'question' } & QuestionWithGroup {
  const { _id = 'q1', code = 'Q1', groupId = 'group-1' } = overrides
  return {
    kind: 'question',
    question: new SurveyQuestion({ _id, code, surveyId: 's1' }),
    group: new SurveySection({ _id: groupId, code: 'G001', surveyId: 's1' }),
  }
}

export function makeContentItem(
  overrides: { _id?: string; code?: string; sectionId?: string } = {},
): SurveyRenderItem {
  const { _id = 'c1', code = 'C1', sectionId = 'group-1' } = overrides
  return {
    kind: 'content',
    element: new SurveyContent({ _id, code, surveyId: 's1' }),
    section: new SurveySection({
      _id: sectionId,
      code: 'G001',
      surveyId: 's1',
    }),
  }
}

export function makeQuestionWithGroup(
  overrides: QuestionOverrides = {},
): QuestionWithGroup {
  const { question, group } = makeQuestionItem(overrides)
  return { question, group }
}

/** A `Survey` whose only populated field is an ordered list of group sections. */
export function makeSurveyWithSections(sectionIds: string[]): Survey {
  return new Survey({
    _id: 's1',
    sectionIds,
    sections: sectionIds.map((_id, i) => ({
      _id,
      code: `G00${i + 1}`,
      surveyId: 's1',
      kind: 'group',
    })),
  })
}
