import { CodeGenerator } from 'util/CodeGenerator'

import {
  SurveySection,
  SurveySectionData,
  SECTION_KIND_GROUP,
  SECTION_KIND_WELCOME,
  SECTION_KIND_THANK_YOU,
  SECTION_KIND_DEFAULT_NAME_LABEL,
} from './SurveySection'
import { SurveyEntityCollection } from './SurveyEntityCollection'

export const SECTION_CODE_PREFIX = 'G'

export class SurveySectionCollection extends SurveyEntityCollection<SurveySection> {
  // Hydrates a collection from stored/serialized data. Unlike add(), this
  // does not enforce code uniqueness — the data may already exist (and, in
  // principle, already contain duplicates), so construction must not throw;
  // any duplicates present are surfaced separately via SurveyValidation.
  fromArray(data: Partial<SurveySectionData>[]): SurveySectionCollection {
    let collection = new SurveySectionCollection()
    data.forEach((item) => {
      const code = item.code || collection.getNextCode()
      const newGroup = new SurveySection(collection.buildEntityInit(code, item))
      collection = new SurveySectionCollection(...collection, newGroup)
    })
    return collection
  }

  getNextCode(prefix?: string): string {
    const existingCodes = this.map((group) => group.code)
    return CodeGenerator.getNextCode(
      prefix || SECTION_CODE_PREFIX,
      existingCodes,
    )
  }

  private buildEntityInit(
    code: string,
    init: Partial<SurveySectionData>,
    options?: { lang?: string },
  ): Partial<SurveySectionData> {
    const label =
      SECTION_KIND_DEFAULT_NAME_LABEL[init.kind || SECTION_KIND_GROUP]
    return {
      code,
      name: { [options?.lang || 'en']: `<h3>${label} ${code}</h3>` },
      ...init,
    }
  }

  add(
    init: Partial<SurveySectionData> = {},
    options?: {
      afterId?: string
      lang?: string
    },
  ): SurveySectionCollection {
    const code = init.code || this.getNextCode()

    if (this.some((section) => section.code === code)) {
      throw new Error(`Section with code "${code}" already exists`)
    }

    const newSection = new SurveySection(
      this.buildEntityInit(code, init, options),
    )

    if (options?.afterId) {
      const afterIndex = this.findIndex(
        (section) => section._id === options?.afterId,
      )
      if (afterIndex !== -1) {
        const newCollection = new SurveySectionCollection(...this)
        newCollection.splice(afterIndex + 1, 0, newSection)
        return newCollection
      }
    }

    // If afterId is not provided or afterId is not found, add to the end
    return new SurveySectionCollection(...this, newSection)
  }

  move(sectionId: string, newIndex: number): SurveySectionCollection {
    const oldIndex = this.findIndex((section) => section._id === sectionId)
    if (oldIndex === -1) return this

    const newCollection = new SurveySectionCollection(...this)
    const [section] = newCollection.splice(oldIndex, 1)
    newCollection.splice(newIndex, 0, section)
    return newCollection
  }

  /** User-managed question groups only (`kind === 'group'`). */
  groups(): SurveySectionCollection {
    return new SurveySectionCollection(
      ...this.filter(
        (s) => (s.kind || SECTION_KIND_GROUP) === SECTION_KIND_GROUP,
      ),
    )
  }

  /** The singleton welcome section, if present. */
  welcome(): SurveySection | undefined {
    return this.find((s) => s.kind === SECTION_KIND_WELCOME)
  }

  /** The singleton thank-you section, if present. */
  thankYou(): SurveySection | undefined {
    return this.find((s) => s.kind === SECTION_KIND_THANK_YOU)
  }
}
