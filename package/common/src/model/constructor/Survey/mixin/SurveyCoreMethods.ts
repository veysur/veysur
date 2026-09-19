import { genUniqueId } from 'mzen-id'

import { SurveySectionCollection } from '../SurveySectionCollection'
import { SurveyElementCollection } from '../SurveyElementCollection'
import { SECTION_KIND_WELCOME, SECTION_KIND_THANK_YOU } from '../SurveySection'
import { SurveyBase } from '../SurveyBase'
import { Constructor } from '../../../type'

/**
 * Cross-mixin dependency: QuestionMethods, SubquestionMethods, and
 * AnswerOptionMethods all call `updateElementCollection`, which
 * SurveyCoreMethods is always composed before (inner to) them in Survey.ts.
 */
export interface HasUpdateElementCollection {
  updateElementCollection(
    elements: SurveyElementCollection,
    mutatedElements: SurveyElementCollection,
    additionalUpdates?: object,
  ): this
}

export function SurveyCoreMethods<T extends Constructor<SurveyBase>>(Base: T) {
  return class extends Base {
    applySortOrder(): this {
      // Fall back to the collection's own order when the id array is empty or
      // out of sync — otherwise a survey whose `sectionIds` / `elementIds` was
      // never populated (e.g. an older row, or a relation hydrated after
      // construction) would lose its sections / elements entirely.
      const sectionOrder =
        this.sectionIds.length >= this.sections.length
          ? this.sectionIds
          : Array.from(this.sections, (s) => s._id)
      const elementOrder =
        this.elementIds.length >= this.elements.length
          ? this.elementIds
          : Array.from(this.elements, (e) => e._id)

      const sortedSections = new SurveySectionCollection()
      sectionOrder.forEach((sectionId) => {
        if (!this.sections || typeof this.sections.getById !== 'function') {
          console.error('Survey instance has invalid sections collection:', {
            sectionsType: typeof this.sections,
            sectionsConstructor: this.sections?.constructor?.name,
            hasGetById: this.sections && 'getById' in this.sections,
            surveyId: this._id,
          })
          return
        }
        const section = this.sections.getById(sectionId)
        if (section) {
          sortedSections.push(section)
        }
      })
      const sortedElements = new SurveyElementCollection()
      elementOrder.forEach((elementId) => {
        if (!this.elements || typeof this.elements.getById !== 'function') {
          console.error('Survey instance has invalid elements collection:', {
            elementsType: typeof this.elements,
            elementsConstructor: this.elements?.constructor?.name,
            hasGetById: this.elements && 'getById' in this.elements,
            surveyId: this._id,
          })
          return
        }
        const element = this.elements.getById(elementId)
        if (element) {
          sortedElements.push(element)
        }
      })

      // Pin the singleton welcome section first and the thank-you section last,
      // regardless of where their ids sit in `sectionIds`.
      const pinnedSections = new SurveySectionCollection(
        ...sortedSections.filter((s) => s.kind === SECTION_KIND_WELCOME),
        ...sortedSections.filter(
          (s) =>
            s.kind !== SECTION_KIND_WELCOME &&
            s.kind !== SECTION_KIND_THANK_YOU,
        ),
        ...sortedSections.filter((s) => s.kind === SECTION_KIND_THANK_YOU),
      )
      const pinnedSectionIds = Array.from(pinnedSections, (s) => s._id)

      return this.newInstance({
        sections: pinnedSections,
        sectionIds: pinnedSectionIds,
        elements: sortedElements,
      })
    }

    static genSectionId(): string {
      return genUniqueId()
    }

    static genElementId(): string {
      return genUniqueId()
    }

    static genContentId(): string {
      return genUniqueId()
    }

    updateName(name: string): this {
      return this.newInstance(name === this.name ? {} : { name })
    }

    updateTitle(text: string, lang: string = 'en'): this {
      return this.newInstance(
        this.title[lang] === text
          ? {}
          : { title: this.title.setLang(text, lang) },
      )
    }

    /**
     * Generic helper for mutating the element collection and returning a new
     * instance.
     *
     * @param elements - The current element collection
     * @param mutatedElements - The new element collection after mutation
     * @param additionalUpdates - Additional updates to include if elements changed
     * @returns New instance if elements changed, same instance otherwise
     *
     * @example
     * ```typescript
     * // Simple element mutation
     * const newElements = this.elements.mutateById(id, mutator)
     * return this.updateElementCollection(this.elements, newElements)
     *
     * // Element mutation with additional updates (e.g. updating element IDs)
     * const newElements = this.elements.move(id, targetSectionId, newIndex)
     * return this.updateElementCollection(
     *   this.elements,
     *   newElements,
     *   { elementIds: newElements.map((e) => e._id) },
     * )
     * ```
     */
    updateElementCollection(
      elements: SurveyElementCollection,
      mutatedElements: SurveyElementCollection,
      additionalUpdates: object = {},
    ): this {
      return this.newInstance(
        mutatedElements === elements
          ? {}
          : { elements: mutatedElements, ...additionalUpdates },
      )
    }
  }
}
