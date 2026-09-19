import { SurveySection, SurveySectionData } from '../SurveySection'
import { AttributeValue, SurveyAttributes } from '../attributeMeta'
import { SurveyBase } from '../SurveyBase'
import { Constructor } from '../../../type'

export function SectionMethods<T extends Constructor<SurveyBase>>(Base: T) {
  return class extends Base {
    addSection(
      init: Partial<SurveySectionData> = {},
      options?: {
        afterId?: string
        lang?: string
      },
    ): this {
      const { afterId, lang } = options || {}
      const initWithDefaults = {
        ...init,
        surveyId: this._id,
        createdById: init.createdById || this.createdById,
      }
      const newSections = this.sections.add(initWithDefaults, { afterId, lang })
      const newSectionIds = newSections.map((section) => section._id)
      return this.newInstance({
        sections: newSections,
        sectionIds: newSectionIds,
      })
    }

    mutateSection(
      sectionId: string,
      mutator: (section: SurveySection) => SurveySection,
    ): this {
      const newSections = this.sections.mutateById(sectionId, mutator)
      return this.newInstance(
        newSections === this.sections ? {} : { sections: newSections },
      )
    }

    updateSection(sectionId: string, data: Partial<SurveySectionData>): this {
      const newSections = this.sections.mutateById(
        sectionId,
        (section) => new SurveySection({ ...section, ...data }),
      )
      return this.newInstance(
        newSections === this.sections ? {} : { sections: newSections },
      )
    }

    moveSection(sectionId: string, newIndex: number): this {
      const newSections = this.sections.move(sectionId, newIndex)
      if (newSections === this.sections) return this.newInstance({})

      const newSectionIds = [...newSections.map((section) => section._id)]
      const newElements = this.elements.sortBySectionIds(newSectionIds)
      const newElementIds = [...newElements.map((element) => element._id)]

      return this.newInstance({
        sections: newSections,
        sectionIds: newSectionIds,
        elements: newElements,
        elementIds: newElementIds,
      })
    }

    deleteSection(sectionId: string): this {
      const newSections = this.sections.deleteById(sectionId)
      const newElements = this.elements.fromArray(
        this.elements.filter((element) => element.sectionId !== sectionId),
      )
      const newSectionIds = newSections.map((section) => section._id)
      const newElementIds = newElements.map((element) => element._id)
      return this.newInstance({
        sections: newSections,
        elements: newElements,
        sectionIds: newSectionIds,
        elementIds: newElementIds,
      })
    }

    mutateSectionAttributes(
      sectionId: string,
      mutator: (attributes: SurveyAttributes) => SurveyAttributes,
    ): this {
      return this.mutateSection(
        sectionId,
        (section) =>
          new SurveySection({
            ...section,
            attributes: mutator(section.attributes),
          }),
      )
    }

    setSectionAttribute(
      sectionId: string,
      attributeId: string,
      value: AttributeValue,
    ): this {
      const newSections = this.sections.setAttribute(
        sectionId,
        attributeId,
        value,
      )
      return this.newInstance(
        newSections === this.sections ? {} : { sections: newSections },
      )
    }
  }
}
