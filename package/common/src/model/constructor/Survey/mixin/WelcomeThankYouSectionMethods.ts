import { genUniqueId } from 'mzen-id'

import { SurveyBase } from '../SurveyBase'
import { Constructor } from '../../../type'
import { SurveySectionCollection } from '../SurveySectionCollection'
import {
  SurveySection,
  SECTION_KIND_WELCOME,
  SECTION_KIND_THANK_YOU,
  SECTION_CODE_WELCOME,
  SECTION_CODE_THANK_YOU,
} from '../SurveySection'

/**
 * Operations for the singleton welcome / thank-you sections — the canonical
 * read/write path since phase 1c slice 4. Each creates the section on first
 * write (welcome pinned first, thank-you pinned last in `sectionIds`) then edits
 * it immutably, mirroring `ContentMethods`. The `updateWelcomeMessage` /
 * `updateThankYou*` / `clearThankYouLink` methods below are `@deprecated`
 * aliases kept for callers not yet moved off the old names.
 */
function makeSection(
  surveyId: string,
  createdById: string,
  kind: typeof SECTION_KIND_WELCOME | typeof SECTION_KIND_THANK_YOU,
  code: string,
): SurveySection {
  return new SurveySection({
    _id: genUniqueId(),
    surveyId,
    createdById,
    kind,
    code,
  })
}

export function WelcomeThankYouSectionMethods<
  T extends Constructor<SurveyBase>,
>(Base: T) {
  return class extends Base {
    ensureWelcomeSection(): this {
      if (this.sections.welcome()) return this
      const section = makeSection(
        this._id,
        this.createdById,
        SECTION_KIND_WELCOME,
        SECTION_CODE_WELCOME,
      )
      return this.newInstance({
        sections: new SurveySectionCollection(section, ...this.sections),
        sectionIds: [section._id, ...this.sectionIds],
      })
    }

    ensureThankYouSection(): this {
      if (this.sections.thankYou()) return this
      const section = makeSection(
        this._id,
        this.createdById,
        SECTION_KIND_THANK_YOU,
        SECTION_CODE_THANK_YOU,
      )
      return this.newInstance({
        sections: new SurveySectionCollection(...this.sections, section),
        sectionIds: [...this.sectionIds, section._id],
      })
    }

    updateWelcomeSectionDesc(text: string, lang: string = 'en'): this {
      const survey = this.ensureWelcomeSection()
      const welcomeId = survey.sections.welcome()!._id
      return survey.newInstance({
        sections: survey.sections.mutateById(welcomeId, (s) =>
          s.updateDescription(text, lang),
        ),
      })
    }

    updateThankYouSectionDesc(text: string, lang: string = 'en'): this {
      const survey = this.ensureThankYouSection()
      const id = survey.sections.thankYou()!._id
      return survey.newInstance({
        sections: survey.sections.mutateById(id, (s) =>
          s.updateDescription(text, lang),
        ),
      })
    }

    updateThankYouSectionLinkUrl(url: string, lang: string = 'en'): this {
      const survey = this.ensureThankYouSection()
      const id = survey.sections.thankYou()!._id
      return survey.newInstance({
        sections: survey.sections.mutateById(id, (s) =>
          s.setConfigLink('url', url, lang),
        ),
      })
    }

    updateThankYouSectionLinkText(text: string, lang: string = 'en'): this {
      const survey = this.ensureThankYouSection()
      const id = survey.sections.thankYou()!._id
      return survey.newInstance({
        sections: survey.sections.mutateById(id, (s) =>
          s.setConfigLink('text', text, lang),
        ),
      })
    }

    clearThankYouSectionLink(): this {
      const section = this.sections.thankYou()
      if (!section?.config?.link) return this
      return this.newInstance({
        sections: this.sections.mutateById(section._id, (s) =>
          s.clearConfigLink(),
        ),
      })
    }
  }
}
