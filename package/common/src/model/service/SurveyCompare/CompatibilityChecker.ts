import { Survey } from '../../constructor/Survey'
import { SurveyQuestion } from '../../constructor/Survey/SurveyQuestion'
import { SurveyAnswerOption } from '../../constructor/Survey/SurveyAnswerOption'
import { SurveySubquestion } from '../../constructor/Survey/SurveySubquestion'
import { SurveyParticipantAttributeDefinition } from '../../constructor/SurveyParticipantAttribute'
import { CompatibilityResult, IncompatibilityDetail } from './types'
import { AttributeCompatibilityChecker } from './AttributeCompatibilityChecker'
import { isMatrixQuestionType } from '../../constructor/Survey/Matrix'
import { isMultiPartQuestionType } from '../../constructor/Survey/MultiPart'

/**
 * Checks if responses from survey-a can be merged into survey-b's response set
 *
 * Compatibility rules:
 * - All questions in survey-a must exist in survey-b
 * - Question types must be compatible
 * - All answer options/subquestions from survey-a must exist in survey-b
 * - Question attributes must be compatible (target cannot have stricter constraints)
 */
export class CompatibilityChecker {
  private attributeChecker: AttributeCompatibilityChecker

  constructor() {
    this.attributeChecker = new AttributeCompatibilityChecker()
  }
  /**
   * Check if survey-a is compatible with survey-b for response merging
   */
  check(
    surveyA: Survey,
    surveyB: Survey,
    participantAttributesA: SurveyParticipantAttributeDefinition[] = [],
    participantAttributesB: SurveyParticipantAttributeDefinition[] = [],
  ): CompatibilityResult {
    const incompatibilities: IncompatibilityDetail[] = []

    // Check each question in survey-a exists and is compatible in survey-b
    surveyA.elements.questionList().forEach((questionA) => {
      this.checkQuestionCompatibility(questionA, surveyB, incompatibilities)
    })

    // Check participant attribute compatibility
    this.checkParticipantAttributeCompatibility(
      participantAttributesA,
      participantAttributesB,
      incompatibilities,
    )

    // Build summary
    const summary = this.buildSummary(incompatibilities)

    return {
      isCompatible: incompatibilities.length === 0,
      incompatibilities,
      summary,
    }
  }

  /**
   * Check custom participant attribute compatibility.
   * Each attribute present in survey-a must exist by name in survey-b (missing is incompatible).
   * If the attribute exists in both but is required in B while not in A, that is flagged as an
   * incompatible_required_constraint so existing participants without the value won't satisfy B's
   * requirements.
   */
  private checkParticipantAttributeCompatibility(
    attributesA: SurveyParticipantAttributeDefinition[],
    attributesB: SurveyParticipantAttributeDefinition[],
    incompatibilities: IncompatibilityDetail[],
  ): void {
    const attributeMapB = new Map(attributesB.map((a) => [a.name, a]))

    for (const attrA of attributesA) {
      const attrB = attributeMapB.get(attrA.name)

      if (!attrB) {
        incompatibilities.push({
          path: `participantAttributes[${attrA.name}]`,
          reason: 'missing_participant_attribute',
          itemType: 'participantAttribute',
          itemCode: attrA.name,
          message: `Participant attribute '${attrA.name}' exists in survey-a but not in survey-b`,
        })
        continue
      }

      if (attrB.required && !attrA.required) {
        incompatibilities.push({
          path: `participantAttributes[${attrA.name}]`,
          reason: 'incompatible_required_constraint',
          itemType: 'participantAttribute',
          itemCode: attrA.name,
          message: `Participant attribute '${attrA.name}' is required in survey-b but was not required in survey-a`,
        })
      }
    }
  }

  /**
   * Check if a specific question from survey-a is compatible with survey-b
   */
  private checkQuestionCompatibility(
    questionA: SurveyQuestion,
    surveyB: Survey,
    incompatibilities: IncompatibilityDetail[],
  ): void {
    const questionB = surveyB.elements
      .questionList()
      .find((q) => q.code === questionA.code)

    // Check 1: Question must exist in survey-b
    if (!questionB) {
      incompatibilities.push({
        path: `questions[${questionA.code}]`,
        reason: 'missing_question',
        itemType: 'question',
        itemCode: questionA.code,
        message: `Question '${questionA.code}' exists in survey-a but not in survey-b`,
      })
      return // No point checking further if question doesn't exist
    }

    // Check 2: Question type must be compatible
    if (!this.areTypesCompatible(questionA.type, questionB.type)) {
      incompatibilities.push({
        path: `questions[${questionA.code}]`,
        reason: 'incompatible_type',
        itemType: 'question',
        itemCode: questionA.code,
        surveyAType: questionA.type,
        surveyBType: questionB.type,
        message: `Question '${questionA.code}' type changed from '${questionA.type}' to '${questionB.type}'`,
      })
    }

    // Check 3: Answer options compatibility (if applicable)
    if (questionA.answerOptions && questionA.answerOptions.length > 0) {
      this.checkAnswerOptionsCompatibility(
        questionA.code,
        questionA.answerOptions,
        questionB.answerOptions || [],
        incompatibilities,
      )
    }

    // Check 4: Subquestions compatibility (if applicable)
    if (questionA.subquestions && questionA.subquestions.length > 0) {
      this.checkSubquestionsCompatibility(
        questionA.code,
        questionA.subquestions,
        questionB.subquestions || [],
        incompatibilities,
      )
    }

    // Check 5: Question attributes compatibility
    const attributeIncompatibilities =
      this.attributeChecker.checkQuestionAttributes(questionA, questionB)
    incompatibilities.push(...attributeIncompatibilities)
  }

  /**
   * Check if question types are compatible for response merging
   * For now, types must match exactly. Future: could support compatible migrations
   */
  private areTypesCompatible(typeA: string, typeB: string): boolean {
    // Exact match is always compatible
    if (typeA === typeB) return true

    // All matrix types are mutually compatible (typed matrix may revert to generic)
    if (isMatrixQuestionType(typeA) && isMatrixQuestionType(typeB)) return true

    // All Multi-Part types are mutually compatible
    if (isMultiPartQuestionType(typeA) && isMultiPartQuestionType(typeB)) {
      return true
    }

    return false
  }

  /**
   * Check answer options compatibility
   */
  private checkAnswerOptionsCompatibility(
    questionCode: string,
    answerOptionsA: SurveyAnswerOption[],
    answerOptionsB: SurveyAnswerOption[],
    incompatibilities: IncompatibilityDetail[],
  ): void {
    const answerCodesB = new Set(answerOptionsB.map((a) => a.code))

    answerOptionsA.forEach((answerA) => {
      if (!answerCodesB.has(answerA.code)) {
        incompatibilities.push({
          path: `questions[${questionCode}].answerOptions[${answerA.code}]`,
          reason: 'missing_answer_option',
          itemType: 'answerOption',
          itemCode: answerA.code,
          message: `Answer option '${answerA.code}' in question '${questionCode}' exists in survey-a but not in survey-b`,
        })
      }
    })
  }

  /**
   * Check subquestions compatibility
   */
  private checkSubquestionsCompatibility(
    questionCode: string,
    subquestionsA: SurveySubquestion[],
    subquestionsB: SurveySubquestion[],
    incompatibilities: IncompatibilityDetail[],
  ): void {
    const subqMapB = new Map(subquestionsB.map((sq) => [sq.code, sq]))

    subquestionsA.forEach((subqA) => {
      const subqB = subqMapB.get(subqA.code)
      if (!subqB) {
        incompatibilities.push({
          path: `questions[${questionCode}].subquestions[${subqA.code}]`,
          reason: 'missing_subquestion',
          itemType: 'subquestion',
          itemCode: subqA.code,
          message: `Subquestion '${subqA.code}' in question '${questionCode}' exists in survey-a but not in survey-b`,
        })
        return
      }

      if (subqA.type !== subqB.type) {
        incompatibilities.push({
          path: `questions[${questionCode}].subquestions[${subqA.code}]`,
          reason: 'incompatible_subquestion_type',
          itemType: 'subquestion',
          itemCode: subqA.code,
          surveyAType: subqA.type,
          surveyBType: subqB.type,
          message: `Subquestion '${subqA.code}' in question '${questionCode}' type changed from '${subqA.type}' to '${subqB.type}'`,
        })
      }
    })
  }

  /**
   * Build summary statistics
   */
  private buildSummary(incompatibilities: IncompatibilityDetail[]) {
    const attributeIncompatibilities = incompatibilities.filter(
      (i) =>
        i.reason === 'incompatible_required_constraint' ||
        i.reason === 'incompatible_choice_constraint' ||
        i.reason === 'incompatible_length_constraint' ||
        i.reason === 'incompatible_number_constraint' ||
        i.reason === 'incompatible_negative_constraint',
    )

    return {
      totalIncompatibilities: incompatibilities.length,
      missingQuestions: incompatibilities.filter(
        (i) => i.reason === 'missing_question',
      ).length,
      incompatibleTypes: incompatibilities.filter(
        (i) => i.reason === 'incompatible_type',
      ).length,
      missingAnswerOptions: incompatibilities.filter(
        (i) => i.reason === 'missing_answer_option',
      ).length,
      missingSubquestions: incompatibilities.filter(
        (i) => i.reason === 'missing_subquestion',
      ).length,
      incompatibleSubquestionTypes: incompatibilities.filter(
        (i) => i.reason === 'incompatible_subquestion_type',
      ).length,
      incompatibleAttributes: attributeIncompatibilities.length,
      incompatibleRequiredConstraints: incompatibilities.filter(
        (i) => i.reason === 'incompatible_required_constraint',
      ).length,
      incompatibleChoiceConstraints: incompatibilities.filter(
        (i) => i.reason === 'incompatible_choice_constraint',
      ).length,
      incompatibleLengthConstraints: incompatibilities.filter(
        (i) => i.reason === 'incompatible_length_constraint',
      ).length,
      incompatibleNumberConstraints: incompatibilities.filter(
        (i) =>
          i.reason === 'incompatible_number_constraint' ||
          i.reason === 'incompatible_negative_constraint',
      ).length,
      missingParticipantAttributes: incompatibilities.filter(
        (i) => i.reason === 'missing_participant_attribute',
      ).length,
    }
  }
}
