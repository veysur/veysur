import { SurveyLanguageAnswerOptionEntry } from 'veysur-common'

import { generateImageSetBasePath } from 'common'

import { RawJson, StructuralSurveyJson } from './types'

type ImageEntry = { fileId?: string; path?: string }

/**
 * Loosely-typed mirror of the JSON shape produced by
 * `JSON.parse(JSON.stringify(snapshotData))` — a deep clone of a snapshot
 * document mutated in place while remapping IDs and image references.
 *
 * `answerOptions[].image` is read via a cast in `remap()` below rather than
 * the real per-language map (`Record<string, SurveyAnswerOptionImageValue |
 * null>`) that `SurveyAnswerOption` declares — the pre-existing
 * `entry.fileId`/`entry.path` mutation operates directly on whatever shape
 * is present in the archive.
 */
export type SnapshotDataJson = RawJson & {
  survey?: StructuralSurveyJson
  surveyLanguageSnapshots?: (RawJson & {
    languageCode?: string
    data?: RawJson & {
      answerOptions?: Record<string, SurveyLanguageAnswerOptionEntry>
    }
  })[]
}

export class SnapshotDataRemapper {
  remap(
    snapshotData: RawJson,
    fileIdMap: Record<string, { newFileId: string; newFilePath: string }>,
    imageSetIdMap: Record<string, string>,
    resolvedSurveyId: string,
    projectId: string,
  ): SnapshotDataJson {
    const data: SnapshotDataJson = JSON.parse(JSON.stringify(snapshotData))

    if (data.survey) {
      if (data.survey._id) data.survey._id = resolvedSurveyId
    }

    const hasFileRemap =
      Object.keys(fileIdMap).length > 0 || Object.keys(imageSetIdMap).length > 0

    for (const element of data.survey?.elements ?? []) {
      if (element.surveyId) element.surveyId = resolvedSurveyId

      if (!hasFileRemap) continue

      for (const option of element.answerOptions ?? []) {
        const entry = option.image as unknown as ImageEntry | null
        if (!entry || typeof entry !== 'object') continue

        if (entry.fileId && fileIdMap[entry.fileId]) {
          entry.fileId = fileIdMap[entry.fileId].newFileId
        }

        if (entry.path) {
          const match = /\/imgset-([^/]+)\//.exec(entry.path)
          if (match) {
            const newSetId = imageSetIdMap[match[1]]
            if (newSetId) {
              const newBase = generateImageSetBasePath(newSetId, {
                projectId,
                surveyId: resolvedSurveyId,
                fileContext: 'survey',
              })
              entry.path = newBase + '/edited.jpg'
            }
          }
        }
      }
    }

    for (const section of data.survey?.sections ?? []) {
      if (section.surveyId) section.surveyId = resolvedSurveyId
    }

    // Remap language snapshot answer option images
    for (const langSnapshot of data.surveyLanguageSnapshots ?? []) {
      if (!hasFileRemap) continue
      const answerOptions = langSnapshot.data?.answerOptions
      if (!answerOptions) continue

      for (const option of Object.values(
        answerOptions,
      ) as SurveyLanguageAnswerOptionEntry[]) {
        const entry = option.image
        if (!entry) continue

        if (entry.fileId && fileIdMap[entry.fileId]) {
          entry.fileId = fileIdMap[entry.fileId].newFileId
        }

        if (entry.path) {
          const match = /\/imgset-([^/]+)\//.exec(entry.path)
          if (match) {
            const newSetId = imageSetIdMap[match[1]]
            if (newSetId) {
              const newBase = generateImageSetBasePath(newSetId, {
                projectId,
                surveyId: resolvedSurveyId,
                fileContext: 'survey',
              })
              entry.path = newBase + '/edited.jpg'
            }
          }
        }
      }
    }

    return data
  }
}
