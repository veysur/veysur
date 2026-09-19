import {
  SurveyAnswerOptionImageValue,
  SurveyLanguageData,
  SurveyLanguageAnswerOptionEntry,
} from 'veysur-common'

interface LanguageLike {
  data: SurveyLanguageData
}

type ElementLike = {
  answerOptions?: Iterable<{
    image?: Record<string, SurveyAnswerOptionImageValue | null> | null
  }>
}

interface SurveyLike {
  elements: { questionList(): Iterable<ElementLike> }
}

export function collectReferencedFileIds(
  survey: SurveyLike,
  languages: LanguageLike[] = [],
): Set<string> {
  const fileIds = new Set<string>()

  // Structural survey: language-map image per answer option
  for (const question of survey.elements.questionList() ?? []) {
    for (const option of question.answerOptions ?? []) {
      if (option.image && typeof option.image === 'object') {
        for (const val of Object.values(
          option.image,
        ) as (SurveyAnswerOptionImageValue | null)[]) {
          if (val?.fileId) fileIds.add(val.fileId)
        }
      }
    }
  }

  // Per-language images stored in SurveyLanguage / SurveyLanguageSnapshot records
  for (const lang of languages) {
    for (const option of Object.values(
      lang.data?.answerOptions ?? {},
    ) as SurveyLanguageAnswerOptionEntry[]) {
      const fileId = option.image?.fileId
      if (fileId) fileIds.add(fileId)
    }
  }

  return fileIds
}
