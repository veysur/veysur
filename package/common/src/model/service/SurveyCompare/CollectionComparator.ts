import { Survey } from '../../constructor/Survey'
import { SurveyQuestion } from '../../constructor/Survey/SurveyQuestion'
import { SurveyContent } from '../../constructor/Survey/SurveyContent'
import { SurveySection } from '../../constructor/Survey/SurveySection'
import { SurveySubquestion } from '../../constructor/Survey/SurveySubquestion'
import { SurveyAnswerOption } from '../../constructor/Survey/SurveyAnswerOption'
import { L10n } from '../../constructor/L10n'
import { CollectionDifference, FieldDifference } from './types'
import { L10nComparator } from './L10nComparator'
import { FieldComparator } from './FieldComparator'

/**
 * Handles comparison of survey collections (groups, questions, subquestions, answer options)
 */
export class CollectionComparator {
  constructor(
    private l10nComparator: L10nComparator,
    private fieldComparator: FieldComparator,
  ) {}

  /**
   * Compare question groups between two surveys
   */
  compareQuestionGroups(
    surveyA: Survey,
    surveyB: Survey,
  ): CollectionDifference[] {
    const collectionDiffs: CollectionDifference[] = []

    // Build code maps
    const groupsAByCode = new Map<string, SurveySection>()
    const groupsBByCode = new Map<string, SurveySection>()

    surveyA.sections.groups().forEach((group) => {
      groupsAByCode.set(group.code, group)
    })

    surveyB.sections.groups().forEach((group) => {
      groupsBByCode.set(group.code, group)
    })

    // Find added groups
    groupsBByCode.forEach((groupB, code) => {
      if (!groupsAByCode.has(code)) {
        collectionDiffs.push({
          path: `groups[${code}]`,
          type: 'added',
          itemId: code,
          itemType: 'group',
          newData: groupB,
        })
      }
    })

    // Find removed groups
    groupsAByCode.forEach((groupA, code) => {
      if (!groupsBByCode.has(code)) {
        collectionDiffs.push({
          path: `groups[${code}]`,
          type: 'removed',
          itemId: code,
          itemType: 'group',
          oldData: groupA,
        })
      }
    })

    // Compare groups in both surveys
    groupsAByCode.forEach((groupA, code) => {
      const groupB = groupsBByCode.get(code)
      if (!groupB) return

      const groupDiffs = this.compareGroup(code, groupA, groupB)
      if (groupDiffs.length > 0) {
        collectionDiffs.push({
          path: `groups[${code}]`,
          type: 'modified',
          itemId: code,
          itemType: 'group',
          oldData: groupA,
          newData: groupB,
          differences: groupDiffs,
        })
      }
    })

    return collectionDiffs
  }

  /**
   * Compare individual group fields
   */
  private compareGroup(
    code: string,
    groupA: SurveySection,
    groupB: SurveySection,
  ): FieldDifference[] {
    const differences: FieldDifference[] = []
    const basePath = `groups[${code}]`

    // Compare name (L10n)
    const nameDiffs = this.l10nComparator.compare(
      `${basePath}.name`,
      groupA.name,
      groupB.name,
    )
    nameDiffs.forEach((diff) => {
      differences.push({
        path: `${diff.path}.${diff.language}`,
        type: diff.type,
        oldValue: diff.oldValue,
        newValue: diff.newValue,
      })
    })

    // Compare desc (L10n)
    const descA = groupA.desc || new L10n()
    const descB = groupB.desc || new L10n()
    const descDiffs = this.l10nComparator.compare(
      `${basePath}.desc`,
      descA,
      descB,
    )
    descDiffs.forEach((diff) => {
      differences.push({
        path: `${diff.path}.${diff.language}`,
        type: diff.type,
        oldValue: diff.oldValue,
        newValue: diff.newValue,
      })
    })

    // Compare attributes
    const attrDiffs = this.fieldComparator.compareNestedObject(
      `${basePath}.attributes`,
      groupA.attributes,
      groupB.attributes,
    )
    differences.push(...attrDiffs)

    // Compare condition
    if (groupA.condition !== groupB.condition) {
      differences.push({
        path: `${basePath}.condition`,
        type: 'modified',
        oldValue: groupA.condition,
        newValue: groupB.condition,
      })
    }

    return differences
  }

  /**
   * Compare questions between two surveys
   */
  compareQuestions(surveyA: Survey, surveyB: Survey): CollectionDifference[] {
    const collectionDiffs: CollectionDifference[] = []

    // Build code maps
    const questionsAByCode = new Map<string, SurveyQuestion>()
    const questionsBByCode = new Map<string, SurveyQuestion>()

    surveyA.elements.questionList().forEach((question) => {
      questionsAByCode.set(question.code, question)
    })

    surveyB.elements.questionList().forEach((question) => {
      questionsBByCode.set(question.code, question)
    })

    // Find added questions
    questionsBByCode.forEach((questionB, code) => {
      if (!questionsAByCode.has(code)) {
        collectionDiffs.push({
          path: `questions[${code}]`,
          type: 'added',
          itemId: code,
          itemType: 'question',
          newData: questionB,
        })
      }
    })

    // Find removed questions
    questionsAByCode.forEach((questionA, code) => {
      if (!questionsBByCode.has(code)) {
        collectionDiffs.push({
          path: `questions[${code}]`,
          type: 'removed',
          itemId: code,
          itemType: 'question',
          oldData: questionA,
        })
      }
    })

    // Compare questions in both surveys
    questionsAByCode.forEach((questionA, code) => {
      const questionB = questionsBByCode.get(code)
      if (!questionB) return

      const questionDiffs = this.compareQuestion(
        code,
        questionA,
        questionB,
        surveyA,
        surveyB,
      )
      if (questionDiffs.length > 0) {
        collectionDiffs.push({
          path: `questions[${code}]`,
          type: 'modified',
          itemId: code,
          itemType: 'question',
          oldData: questionA,
          newData: questionB,
          differences: questionDiffs,
        })
      }
    })

    return collectionDiffs
  }

  /**
   * Compare individual question fields including subquestions and answer options
   */
  private compareQuestion(
    code: string,
    questionA: SurveyQuestion,
    questionB: SurveyQuestion,
    surveyA: Survey,
    surveyB: Survey,
  ): FieldDifference[] {
    const differences: FieldDifference[] = []
    const basePath = `questions[${code}]`

    // Compare type
    if (questionA.type !== questionB.type) {
      differences.push({
        path: `${basePath}.type`,
        type: 'modified',
        oldValue: questionA.type,
        newValue: questionB.type,
      })
    }

    // Compare text (L10n)
    const textDiffs = this.l10nComparator.compare(
      `${basePath}.text`,
      questionA.text,
      questionB.text,
    )
    textDiffs.forEach((diff) => {
      differences.push({
        path: `${diff.path}.${diff.language}`,
        type: diff.type,
        oldValue: diff.oldValue,
        newValue: diff.newValue,
      })
    })

    // Compare detail (L10n)
    const detailA = questionA.detail || new L10n()
    const detailB = questionB.detail || new L10n()
    const detailDiffs = this.l10nComparator.compare(
      `${basePath}.detail`,
      detailA,
      detailB,
    )
    detailDiffs.forEach((diff) => {
      differences.push({
        path: `${diff.path}.${diff.language}`,
        type: diff.type,
        oldValue: diff.oldValue,
        newValue: diff.newValue,
      })
    })

    // Compare groupId
    const groupCodeA = this.getGroupCodeById(surveyA, questionA.sectionId)
    const groupCodeB = this.getGroupCodeById(surveyB, questionB.sectionId)
    if (groupCodeA !== groupCodeB) {
      differences.push({
        path: `${basePath}.sectionId`,
        type: 'modified',
        oldValue: groupCodeA,
        newValue: groupCodeB,
      })
    }

    // Compare attributes
    const attrDiffs = this.fieldComparator.compareNestedObject(
      `${basePath}.attributes`,
      questionA.attributes,
      questionB.attributes,
    )
    differences.push(...attrDiffs)

    // Compare condition
    if (questionA.condition !== questionB.condition) {
      differences.push({
        path: `${basePath}.condition`,
        type: 'modified',
        oldValue: questionA.condition,
        newValue: questionB.condition,
      })
    }

    // Compare subquestions
    const subqDiffs = this.compareSubquestions(code, questionA, questionB)
    differences.push(...subqDiffs)

    // Compare answer options
    const answerDiffs = this.compareAnswerOptions(code, questionA, questionB)
    differences.push(...answerDiffs)

    return differences
  }

  /**
   * Compare content elements between two surveys, keyed by code. Content
   * elements are first-class in the diff (tracked, reordering-detected, hashed)
   * but never gate response-merge compatibility — they hold no stored answer.
   */
  compareContents(surveyA: Survey, surveyB: Survey): CollectionDifference[] {
    const collectionDiffs: CollectionDifference[] = []
    const aByCode = new Map<string, SurveyContent>()
    const bByCode = new Map<string, SurveyContent>()

    surveyA.contents.forEach((el) => aByCode.set(el.code, el))
    surveyB.contents.forEach((el) => bByCode.set(el.code, el))

    bByCode.forEach((elB, code) => {
      if (!aByCode.has(code)) {
        collectionDiffs.push({
          path: `contents[${code}]`,
          type: 'added',
          itemId: code,
          itemType: 'content',
          newData: elB,
        })
      }
    })

    aByCode.forEach((elA, code) => {
      if (!bByCode.has(code)) {
        collectionDiffs.push({
          path: `contents[${code}]`,
          type: 'removed',
          itemId: code,
          itemType: 'content',
          oldData: elA,
        })
      }
    })

    aByCode.forEach((elA, code) => {
      const elB = bByCode.get(code)
      if (!elB) return
      const diffs = this.compareContent(code, elA, elB, surveyA, surveyB)
      if (diffs.length > 0) {
        collectionDiffs.push({
          path: `contents[${code}]`,
          type: 'modified',
          itemId: code,
          itemType: 'content',
          oldData: elA,
          newData: elB,
          differences: diffs,
        })
      }
    })

    return collectionDiffs
  }

  private compareContent(
    code: string,
    elA: SurveyContent,
    elB: SurveyContent,
    surveyA: Survey,
    surveyB: Survey,
  ): FieldDifference[] {
    const differences: FieldDifference[] = []
    const basePath = `contents[${code}]`

    if (elA.type !== elB.type) {
      differences.push({
        path: `${basePath}.type`,
        type: 'modified',
        oldValue: elA.type,
        newValue: elB.type,
      })
    }

    const textDiffs = this.l10nComparator.compare(
      `${basePath}.text`,
      elA.text,
      elB.text,
    )
    textDiffs.forEach((diff) => {
      differences.push({
        path: `${diff.path}.${diff.language}`,
        type: diff.type,
        oldValue: diff.oldValue,
        newValue: diff.newValue,
      })
    })

    const sectionCodeA = this.getGroupCodeById(surveyA, elA.sectionId)
    const sectionCodeB = this.getGroupCodeById(surveyB, elB.sectionId)
    if (sectionCodeA !== sectionCodeB) {
      differences.push({
        path: `${basePath}.sectionId`,
        type: 'modified',
        oldValue: sectionCodeA,
        newValue: sectionCodeB,
      })
    }

    differences.push(
      ...this.fieldComparator.compareNestedObject(
        `${basePath}.attributes`,
        elA.attributes,
        elB.attributes,
      ),
    )

    if (elA.condition !== elB.condition) {
      differences.push({
        path: `${basePath}.condition`,
        type: 'modified',
        oldValue: elA.condition,
        newValue: elB.condition,
      })
    }

    differences.push(
      ...this.fieldComparator.compareNestedObject(
        `${basePath}.config`,
        (elA.config ?? {}) as Record<string, unknown>,
        (elB.config ?? {}) as Record<string, unknown>,
      ),
    )

    return differences
  }

  /**
   * Compare the singleton welcome / thank-you sections between two surveys.
   * Keyed by the sentinel section code (`WELCOME` / `THANKYOU`); each is present
   * at most once. `compareQuestionGroups` never sees these (it iterates the
   * kind-filtered `survey.sections.groups()`).
   */
  compareSections(surveyA: Survey, surveyB: Survey): CollectionDifference[] {
    const collectionDiffs: CollectionDifference[] = []

    const pairs: [
      string,
      SurveySection | undefined,
      SurveySection | undefined,
    ][] = [
      ['WELCOME', surveyA.welcomeSection, surveyB.welcomeSection],
      ['THANKYOU', surveyA.thankYouSection, surveyB.thankYouSection],
    ]

    pairs.forEach(([code, sectionA, sectionB]) => {
      const path = `sections[${code}]`

      if (!sectionA && sectionB) {
        collectionDiffs.push({
          path,
          type: 'added',
          itemId: code,
          itemType: 'section',
          newData: sectionB,
        })
        return
      }

      if (sectionA && !sectionB) {
        collectionDiffs.push({
          path,
          type: 'removed',
          itemId: code,
          itemType: 'section',
          oldData: sectionA,
        })
        return
      }

      if (!sectionA || !sectionB) return

      const sectionDiffs = this.compareSection(code, sectionA, sectionB)
      if (sectionDiffs.length > 0) {
        collectionDiffs.push({
          path,
          type: 'modified',
          itemId: code,
          itemType: 'section',
          oldData: sectionA,
          newData: sectionB,
          differences: sectionDiffs,
        })
      }
    })

    return collectionDiffs
  }

  private compareSection(
    code: string,
    sectionA: SurveySection,
    sectionB: SurveySection,
  ): FieldDifference[] {
    const differences: FieldDifference[] = []
    const basePath = `sections[${code}]`

    this.pushL10nDiffs(
      differences,
      `${basePath}.desc`,
      new L10n(sectionA.desc ?? undefined),
      new L10n(sectionB.desc ?? undefined),
    )
    this.pushL10nDiffs(
      differences,
      `${basePath}.config.link.url`,
      new L10n(sectionA.config?.link?.url),
      new L10n(sectionB.config?.link?.url),
    )
    this.pushL10nDiffs(
      differences,
      `${basePath}.config.link.text`,
      new L10n(sectionA.config?.link?.text),
      new L10n(sectionB.config?.link?.text),
    )

    differences.push(
      ...this.fieldComparator.compareNestedObject(
        `${basePath}.attributes`,
        sectionA.attributes,
        sectionB.attributes,
      ),
    )

    if (sectionA.condition !== sectionB.condition) {
      differences.push({
        path: `${basePath}.condition`,
        type: 'modified',
        oldValue: sectionA.condition,
        newValue: sectionB.condition,
      })
    }

    return differences
  }

  private pushL10nDiffs(
    differences: FieldDifference[],
    path: string,
    a: L10n,
    b: L10n,
  ): void {
    this.l10nComparator.compare(path, a, b).forEach((diff) => {
      differences.push({
        path: `${diff.path}.${diff.language}`,
        type: diff.type,
        oldValue: diff.oldValue,
        newValue: diff.newValue,
      })
    })
  }

  /**
   * Get group code by group ID
   */
  private getGroupCodeById(
    survey: Survey,
    groupId?: string,
  ): string | undefined {
    if (!groupId) return undefined
    const group = survey.sections.groups().find((g) => g._id === groupId)
    return group?.code
  }

  /**
   * Compare subquestions within a question
   */
  private compareSubquestions(
    questionCode: string,
    questionA: SurveyQuestion,
    questionB: SurveyQuestion,
  ): FieldDifference[] {
    const differences: FieldDifference[] = []
    const basePath = `questions[${questionCode}]`

    // Build code maps
    const subquestionsAByCode = new Map<string, SurveySubquestion>()
    const subquestionsBByCode = new Map<string, SurveySubquestion>()

    questionA.subquestions?.forEach((subq) => {
      subquestionsAByCode.set(subq.code, subq)
    })

    questionB.subquestions?.forEach((subq) => {
      subquestionsBByCode.set(subq.code, subq)
    })

    // Find added subquestions
    subquestionsBByCode.forEach((subqB, code) => {
      if (!subquestionsAByCode.has(code)) {
        differences.push({
          path: `${basePath}.subquestions[${code}]`,
          type: 'added',
          newValue: subqB,
        })
      }
    })

    // Find removed subquestions
    subquestionsAByCode.forEach((subqA, code) => {
      if (!subquestionsBByCode.has(code)) {
        differences.push({
          path: `${basePath}.subquestions[${code}]`,
          type: 'removed',
          oldValue: subqA,
        })
      }
    })

    // Compare subquestions in both
    subquestionsAByCode.forEach((subqA, code) => {
      const subqB = subquestionsBByCode.get(code)
      if (!subqB) return

      // Compare type
      if (subqA.type !== subqB.type) {
        differences.push({
          path: `${basePath}.subquestions[${code}].type`,
          type: 'modified',
          oldValue: subqA.type,
          newValue: subqB.type,
        })
      }

      // Compare attributes
      const attrDiffs = this.fieldComparator.compareNestedObject(
        `${basePath}.subquestions[${code}].attributes`,
        subqA.attributes,
        subqB.attributes,
      )
      differences.push(...attrDiffs)

      // Compare text
      const textDiffs = this.l10nComparator.compare(
        `${basePath}.subquestions[${code}].text`,
        subqA.text,
        subqB.text,
      )
      textDiffs.forEach((diff) => {
        differences.push({
          path: `${diff.path}.${diff.language}`,
          type: diff.type,
          oldValue: diff.oldValue,
          newValue: diff.newValue,
        })
      })

      // Compare detail
      const detailA = subqA.detail || new L10n()
      const detailB = subqB.detail || new L10n()
      const detailDiffs = this.l10nComparator.compare(
        `${basePath}.subquestions[${code}].detail`,
        detailA,
        detailB,
      )
      detailDiffs.forEach((diff) => {
        differences.push({
          path: `${diff.path}.${diff.language}`,
          type: diff.type,
          oldValue: diff.oldValue,
          newValue: diff.newValue,
        })
      })
    })

    return differences
  }

  /**
   * Compare answer options within a question
   */
  private compareAnswerOptions(
    questionCode: string,
    questionA: SurveyQuestion,
    questionB: SurveyQuestion,
  ): FieldDifference[] {
    const differences: FieldDifference[] = []
    const basePath = `questions[${questionCode}]`

    // Build code maps
    const answersAByCode = new Map<string, SurveyAnswerOption>()
    const answersBByCode = new Map<string, SurveyAnswerOption>()

    questionA.answerOptions?.forEach((answer) => {
      answersAByCode.set(answer.code, answer)
    })

    questionB.answerOptions?.forEach((answer) => {
      answersBByCode.set(answer.code, answer)
    })

    // Find added answer options
    answersBByCode.forEach((answerB, code) => {
      if (!answersAByCode.has(code)) {
        differences.push({
          path: `${basePath}.answerOptions[${code}]`,
          type: 'added',
          newValue: answerB,
        })
      }
    })

    // Find removed answer options
    answersAByCode.forEach((answerA, code) => {
      if (!answersBByCode.has(code)) {
        differences.push({
          path: `${basePath}.answerOptions[${code}]`,
          type: 'removed',
          oldValue: answerA,
        })
      }
    })

    // Compare answer options in both
    answersAByCode.forEach((answerA, code) => {
      const answerB = answersBByCode.get(code)
      if (!answerB) return

      // Compare label
      const labelDiffs = this.l10nComparator.compare(
        `${basePath}.answerOptions[${code}].label`,
        answerA.label,
        answerB.label,
      )
      labelDiffs.forEach((diff) => {
        differences.push({
          path: `${diff.path}.${diff.language}`,
          type: diff.type,
          oldValue: diff.oldValue,
          newValue: diff.newValue,
        })
      })

      // Compare image (per-language map, not an L10n instance)
      const imageDiffs = this.fieldComparator.compareNestedObject(
        `${basePath}.answerOptions[${code}].image`,
        answerA.image,
        answerB.image,
      )
      differences.push(...imageDiffs)
    })

    return differences
  }
}
