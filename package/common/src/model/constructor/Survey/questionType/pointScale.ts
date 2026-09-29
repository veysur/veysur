import { PropsOf } from '@datacapy/schema'

import { PredefinedAnswerOption } from './types'
import { SurveyAnswerOption } from '../SurveyAnswerOption'
import { L10n } from '../../L10n'
import {
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
} from '../attributeMeta/types'
import { MULTI_PART_TYPE_CONFIG } from '../MultiPart'

/**
 * Builds the predefined answer options for a fixed 1-N point scale (star
 * rating, Likert/NPS-style point scales), e.g. count=5 -> P1..P5.
 *
 * This drives the condition system (value/code semantics) and must stay
 * untouched - it is deliberately separate from `buildPointScaleAnswerOptions`
 * below, which only carries optional display labels.
 */
export function buildPointScaleOptions(
  count: number,
): PredefinedAnswerOption[] {
  const options: PredefinedAnswerOption[] = []
  for (let point = 1; point <= count; point++) {
    options.push({ code: `P${point}`, label: `${point}`, value: point })
  }
  return options
}

/**
 * Builds real, persisted `SurveyAnswerOption` data for a fixed 1-N point
 * scale, e.g. count=5 -> P1..P5, each with an empty (opt-in) label.
 *
 * Unlike `buildPointScaleOptions`, these are stored on the question's own
 * `answerOptions` collection purely so authors can attach an optional
 * caption per point (e.g. "Strongly disagree" on point 1). They carry no
 * `value` - the point's numeric value for scoring/conditions continues to
 * come exclusively from `buildPointScaleOptions`'s `predefinedAnswerOptions`
 * and the participant's raw response number. Codes match 1:1 with
 * `buildPointScaleOptions` (`P1`..`PN`) purely by convention - the two lists
 * are otherwise unrelated and not cross-referenced by code at runtime
 * (labels are read back by array index, not by code).
 */
export function buildPointScaleAnswerOptions(
  count: number,
  createdById: string,
): Partial<PropsOf<SurveyAnswerOption>>[] {
  const options: Partial<PropsOf<SurveyAnswerOption>>[] = []
  for (let point = 1; point <= count; point++) {
    options.push({ code: `P${point}`, label: new L10n(), createdById })
  }
  return options
}

const POINT_SCALE_COUNTS: Record<string, number> = {
  [QUESTION_TYPE_STAR_RATING]: 5,
  [QUESTION_TYPE_POINT_5]: 5,
  [QUESTION_TYPE_POINT_10]: 10,
}

/**
 * Resolves a question type (direct or Multi-Part) to its point-scale point
 * count, e.g. `point10`/`multiPartPoint10` -> 10. Returns undefined for any
 * other question type - including `yesNo`, which also has predefined answer
 * options but is deliberately out of scope for per-point labels.
 */
export function getPointScaleCount(type: string): number | undefined {
  const resolvedType = MULTI_PART_TYPE_CONFIG[type]?.partType ?? type
  return POINT_SCALE_COUNTS[resolvedType]
}
