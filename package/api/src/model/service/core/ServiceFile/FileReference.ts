import { ServerErrorNotFound } from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import { File, SurveyAnswerOptionImageValue } from 'veysur-common'

import { RepoFile, RepoSurvey } from 'model'

export interface FileRef {
  type: string
  id: string
}

export class FileReference {
  /**
   * Check if a file is still used in a survey
   */
  static async isFileUsedInSurvey(
    repoSurvey: RepoSurvey,
    fileId: string,
    surveyId: string,
    context: DataSourceContext,
  ): Promise<boolean> {
    const survey = await repoSurvey.findOne(
      { _id: surveyId },
      { context, populate: { elements: true } },
    )

    if (!survey || !survey.elements) {
      return false
    }

    // Check if file is used in any answer option
    const questions = survey.elements.questionList()

    for (const question of questions) {
      if (question.answerOptions) {
        for (const answerOption of question.answerOptions) {
          if (
            answerOption.image &&
            typeof answerOption.image === 'object' &&
            Object.values(
              answerOption.image as Record<
                string,
                SurveyAnswerOptionImageValue | null
              >,
            ).some((v) => v?.fileId === fileId)
          ) {
            return true
          }
        }
      }
    }

    return false
  }

  /**
   * Add a reference to a file
   */
  static async addFileReference(
    repoFile: RepoFile,
    fileId: string,
    type: string,
    id: string,
    context: DataSourceContext,
  ): Promise<void> {
    const file = await repoFile.findOne({ _id: fileId }, { context })
    if (!file) {
      throw new ServerErrorNotFound('File not found')
    }

    const refs = file.refs || []

    // Don't add duplicate references
    const exists = refs.some((ref) => ref.type === type && ref.id === id)

    if (exists) {
      return
    }

    refs.push({ type, id })

    await repoFile.updateOne({ _id: fileId }, { $set: { refs } }, { context })
  }

  /**
   * Remove a reference from a file
   * If refs becomes empty, set to null to indicate no references
   */
  static async removeFileReference(
    repoFile: RepoFile,
    fileId: string,
    type: string,
    id: string,
    context: DataSourceContext,
  ): Promise<void> {
    const file = await repoFile.findOne({ _id: fileId }, { context })
    if (!file) {
      return // File already deleted
    }

    if (!file.refs || file.refs.length === 0) {
      return // No references to remove
    }

    const refs = file.refs.filter(
      (ref) => !(ref.type === type && ref.id === id),
    )

    await repoFile.updateOne(
      { _id: fileId },
      { $set: { refs: refs.length > 0 ? refs : null } },
      { context },
    )
  }

  /**
   * Remove stale survey references from a file
   * Checks if survey references are still valid and removes them if not
   */
  static async removeStaleReferences(
    repoFile: RepoFile,
    repoSurvey: RepoSurvey,
    file: File,
    context: DataSourceContext,
  ): Promise<void> {
    if (!file.refs || file.refs.length === 0) {
      return
    }

    const surveyRefs = file.refs.filter((ref) => ref.type === 'survey')

    for (const surveyRef of surveyRefs) {
      try {
        const isUsed = await this.isFileUsedInSurvey(
          repoSurvey,
          file._id,
          surveyRef.id,
          context,
        )

        if (!isUsed) {
          await this.removeFileReference(
            repoFile,
            file._id,
            'survey',
            surveyRef.id,
            context,
          )
        }
      } catch (_error) {
        // Silently ignore errors when checking/removing stale references
      }
    }
  }
}
