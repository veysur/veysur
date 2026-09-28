import {
  SurveyImportIdTranslator,
  SurveyImportValidator,
  SurveyImportRepairer,
} from 'veysur-common'

import { contextForProject } from 'common'
import { RepoSurvey, RepoSurveyElement, RepoSurveySection } from 'model'
import { AclContext } from 'model/entity/AclContext'

import { ImportValidationResult } from '../../EntityHandlerInterface'
import { MarkdownParsedBundle, MarkdownResolvedContext } from './types'

/**
 * Thin counterpart to VsstImportResolver for markdown v1 imports — no file
 * resolution, no surveyLanguages/participantAttributes/emailTemplates (all
 * out of scope for markdown v1, spec §2.1). Reuses SurveyImportIdTranslator
 * and SurveyImportValidator unmodified: the markdown parser already produces
 * data shaped exactly like ImportSurveyData. Deliberately does not add its
 * own duplicate-code check — see survey-markdown-format.md implementation
 * plan §7 item 9: this matches SurveyImportValidator's current (no-check)
 * behaviour rather than introducing a stricter rule unilaterally.
 */
export class MarkdownImportResolver {
  constructor(private repoSurvey: RepoSurvey) {}

  async resolve(
    bundle: MarkdownParsedBundle,
    options: { force?: boolean; projectId: string; aclContext: AclContext },
  ): Promise<
    ImportValidationResult<MarkdownResolvedContext> & {
      hasIdTranslations: boolean
    }
  > {
    const { force = false, projectId } = options

    const repoSection =
      this.repoSurvey.getRepo<RepoSurveySection>('surveySection')
    const repoElement =
      this.repoSurvey.getRepo<RepoSurveyElement>('surveyElement')

    const dsContext = contextForProject(projectId)

    const translator = new SurveyImportIdTranslator({
      surveyRepo: this.repoSurvey,
      sectionRepo: repoSection,
      elementRepo: repoElement,
    })

    const { data: translatedData, translations } = await translator.translate(
      {
        survey: bundle.survey,
        sections: bundle.sections,
        elements: bundle.elements,
      },
      dsContext,
    )

    const validator = new SurveyImportValidator(force)
    const validationResult = await validator.validate(translatedData)

    if (!validationResult.valid && !force) {
      return {
        valid: false,
        errors: validationResult.errors,
        hasIdTranslations: translations.length > 0,
      }
    }

    let finalData = translatedData
    let repairs: unknown[] = []
    let discards: unknown[] = []

    if (force && !validationResult.valid) {
      const repairer = new SurveyImportRepairer()
      const repairResult = repairer.repair(
        translatedData,
        validationResult.errors,
      )
      finalData = repairResult.data
      repairs = repairResult.repairs
      discards = repairResult.discards
    }

    return {
      valid: validationResult.valid,
      errors: validationResult.errors,
      data: {
        sourceFormat: 'markdown',
        survey: finalData.survey,
        sections: finalData.sections,
        elements: finalData.elements,
      },
      repairs,
      discards,
      hasIdTranslations: translations.length > 0,
    }
  }
}
