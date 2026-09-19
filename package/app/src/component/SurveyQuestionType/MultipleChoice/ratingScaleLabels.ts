import {
  SurveyQuestion,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
} from 'veysur-common'

// Point-scale parts (star/point5/point10) share a single set of point labels
// stored once on the parent question as answerOptions - see
// `questionType/pointScale.ts` - rather than per point.
export const getRatingPointLabel = (
  question: SurveyQuestion,
  index: number,
  lang: string,
  langDefault: string,
): string | undefined =>
  question?.answerOptions?.[index]?.label?.getLang(lang, langDefault)

// Column width/gap for each point-scale type's point buttons, shared between
// each control's own rendering and QuestionTypeMultiPart's shared labels
// header so the header columns stay aligned with the rows underneath.
export const POINT_SCALE_LAYOUT: Record<
  string,
  { columnWidth: string; gapClassName: string }
> = {
  [QUESTION_TYPE_STAR_RATING]: { columnWidth: '4.5rem', gapClassName: 'gap-1' },
  [QUESTION_TYPE_POINT_5]: { columnWidth: '4.5rem', gapClassName: 'gap-2' },
  [QUESTION_TYPE_POINT_10]: { columnWidth: '3.5rem', gapClassName: 'gap-2' },
}
