import { SurveyBase } from '../SurveyBase'
import { Constructor } from '../../../type'
import {
  SurveyContent,
  SurveyContentData,
  SurveyContentConfig,
} from '../SurveyContent'
import { HasUpdateElementCollection } from './SurveyCoreMethods'

/**
 * The move operations `ContentMethods` delegates to. They operate on the shared
 * (mixed) `elements` collection keyed by `element.sectionId` and are entirely
 * kind-agnostic, so reordering a content element is the same logic as reordering
 * a question — we route through `QuestionMethods` rather than duplicate it.
 * `QuestionMethods` is composed immediately inside `ContentMethods` in `Survey.ts`.
 */
export interface HasElementMoveMethods {
  moveQuestion(
    elementId: string,
    targetSectionId: string,
    newIndex: number,
  ): this
  moveQuestionUp(elementId: string): this
  moveQuestionDown(elementId: string): this
}

/**
 * Operations for content elements — the non-interactive leaves interleaved with
 * questions in the ordered element list. Each edit routes through
 * `elements.mutateContentById` (a no-op if the id is absent or a question) and
 * `updateElementCollection`, mirroring `QuestionMethods`.
 */
export function ContentMethods<
  T extends Constructor<
    SurveyBase & HasUpdateElementCollection & HasElementMoveMethods
  >,
>(Base: T) {
  return class extends Base {
    addContent(
      sectionId: string,
      init: Partial<SurveyContentData> = {},
      options?: { afterId?: string; lang?: string },
    ): this {
      const { afterId, lang } = options || {}
      const newElements = this.elements
        .addContent(
          {
            ...init,
            surveyId: this._id,
            createdById: init.createdById || this.createdById,
          },
          { sectionId, afterId, lang },
        )
        .sortBySectionIds(this.sectionIds)
      return this.newInstance({
        elements: newElements,
        elementIds: newElements.map((e) => e._id),
      })
    }

    updateContent(elementId: string, data: Partial<SurveyContentData>): this {
      return this.updateElementCollection(
        this.elements,
        this.elements.mutateContentById(
          elementId,
          (content) => new SurveyContent({ ...content, ...data }),
        ),
      )
    }

    updateContentText(
      elementId: string,
      text: string,
      language: string = 'en',
      defaultLanguage?: string,
    ): this {
      return this.updateElementCollection(
        this.elements,
        this.elements.mutateContentById(elementId, (content) =>
          content.updateText(text, language, defaultLanguage),
        ),
      )
    }

    setContentConfig(
      elementId: string,
      config: SurveyContentConfig | null,
    ): this {
      return this.updateElementCollection(
        this.elements,
        this.elements.mutateContentById(elementId, (content) =>
          content.setConfig(config),
        ),
      )
    }

    updateContentCondition(elementId: string, condition: string | null): this {
      return this.updateElementCollection(
        this.elements,
        this.elements.mutateContentById(elementId, (content) =>
          condition
            ? content.updateCondition(condition)
            : content.clearCondition(),
        ),
      )
    }

    deleteContent(elementId: string): this {
      const newElements = this.elements.deleteById(elementId)
      return this.newInstance(
        newElements === this.elements
          ? {}
          : {
              elements: newElements,
              elementIds: newElements.map((e) => e._id),
            },
      )
    }

    moveContent(
      elementId: string,
      targetSectionId: string,
      newIndex: number,
    ): this {
      return this.moveQuestion(elementId, targetSectionId, newIndex)
    }

    moveContentUp(elementId: string): this {
      return this.moveQuestionUp(elementId)
    }

    moveContentDown(elementId: string): this {
      return this.moveQuestionDown(elementId)
    }
  }
}
