import { Survey } from '../../constructor/Survey'
import { L10n } from '../../constructor/L10n'
import { SurveyParticipantAttributeDefinition } from '../../constructor/SurveyParticipantAttribute'
import {
  SurveyComparisonResult,
  ParticipantAttributeLanguageDoc,
} from './types'
import { L10nComparator } from './L10nComparator'
import { FieldComparator } from './FieldComparator'
import { CollectionComparator } from './CollectionComparator'
import { ReorderingDetector } from './ReorderingDetector'
import { SummaryBuilder } from './SummaryBuilder'
import { CompatibilityChecker } from './CompatibilityChecker'
import { ParticipantAttributeComparator } from './ParticipantAttributeComparator'

// Re-export types
export * from './types'

/**
 * Pre-condition: both surveys must have all relevant languages merged via
 * mergeSurveyLanguageIntoSurvey() before being passed to compare().
 * The API layer is responsible for loading and merging SurveyLanguage records
 * before calling this service.
 */

/**
 * Main service class for comparing two Survey objects
 * Uses composition to delegate specific comparison tasks to specialized comparators
 */
export class SurveyCompare {
  private l10nComparator: L10nComparator
  private fieldComparator: FieldComparator
  private collectionComparator: CollectionComparator
  private reorderingDetector: ReorderingDetector
  private summaryBuilder: SummaryBuilder
  private compatibilityChecker: CompatibilityChecker
  private participantAttributeComparator: ParticipantAttributeComparator

  constructor() {
    this.l10nComparator = new L10nComparator()
    this.fieldComparator = new FieldComparator()
    this.collectionComparator = new CollectionComparator(
      this.l10nComparator,
      this.fieldComparator,
    )
    this.reorderingDetector = new ReorderingDetector()
    this.summaryBuilder = new SummaryBuilder()
    this.compatibilityChecker = new CompatibilityChecker()
    this.participantAttributeComparator = new ParticipantAttributeComparator()
  }

  /**
   * Compare two Survey objects and return detailed differences.
   * Optionally pass participant attribute arrays from the API layer (ordered lists
   * of {name, required}) so the CompatibilityChecker can detect missing or
   * constraint-upgraded attributes. Both default to [] when not supplied.
   */
  compare(
    surveyA: Survey,
    surveyB: Survey,
    participantAttributesA: SurveyParticipantAttributeDefinition[] = [],
    participantAttributesB: SurveyParticipantAttributeDefinition[] = [],
    participantAttributeLanguagesA: ParticipantAttributeLanguageDoc[] = [],
    participantAttributeLanguagesB: ParticipantAttributeLanguageDoc[] = [],
  ): SurveyComparisonResult {
    const differences: SurveyComparisonResult['differences'] = {
      fields: [],
      l10n: [],
      collections: [],
      participantAttributes: [],
      participantAttributesL10n: [],
      reordering: {},
    }

    // Compare simple fields
    this.compareSimpleFields(surveyA, surveyB, differences)

    // Compare L10n fields
    this.compareL10nFields(surveyA, surveyB, differences)

    // Compare configuration objects
    this.compareConfigObjects(surveyA, surveyB, differences)

    // Compare collections
    const groupDiffs = this.collectionComparator.compareQuestionGroups(
      surveyA,
      surveyB,
    )
    const questionDiffs = this.collectionComparator.compareQuestions(
      surveyA,
      surveyB,
    )
    const contentDiffs = this.collectionComparator.compareContents(
      surveyA,
      surveyB,
    )
    const sectionDiffs = this.collectionComparator.compareSections(
      surveyA,
      surveyB,
    )
    differences.collections.push(
      ...groupDiffs,
      ...questionDiffs,
      ...contentDiffs,
      ...sectionDiffs,
    )

    // Detect reordering
    const groupReorder = this.reorderingDetector.detectGroupReordering(
      surveyA,
      surveyB,
    )
    if (groupReorder) {
      differences.reordering.groups = groupReorder
    }

    const questionReorder = this.reorderingDetector.detectQuestionReordering(
      surveyA,
      surveyB,
    )
    if (questionReorder) {
      differences.reordering.questions = questionReorder
    }

    // Compare participant attributes
    differences.participantAttributes =
      this.participantAttributeComparator.compare(
        participantAttributesA,
        participantAttributesB,
      )
    differences.participantAttributesL10n =
      this.participantAttributeComparator.compareLanguages(
        participantAttributeLanguagesA,
        participantAttributeLanguagesB,
      )

    // Build summary
    const summary = this.summaryBuilder.build(differences)
    const isEquivalent = summary.totalChanges === 0

    // Check compatibility
    const compatibility = this.compatibilityChecker.check(
      surveyA,
      surveyB,
      participantAttributesA,
      participantAttributesB,
    )

    return {
      isEquivalent,
      isCompatible: compatibility.isCompatible,
      compatibility,
      differences,
      summary,
    }
  }

  /**
   * Compare simple primitive fields
   */
  private compareSimpleFields(
    surveyA: Survey,
    surveyB: Survey,
    differences: SurveyComparisonResult['differences'],
  ): void {
    // Compare name
    if (surveyA.name !== surveyB.name) {
      differences.fields.push({
        path: 'name',
        type: 'modified',
        oldValue: surveyA.name,
        newValue: surveyB.name,
      })
    }

    // Compare createdById
    if (surveyA.createdById !== surveyB.createdById) {
      differences.fields.push({
        path: 'createdById',
        type: 'modified',
        oldValue: surveyA.createdById,
        newValue: surveyB.createdById,
      })
    }
  }

  /**
   * Compare L10n fields
   */
  private compareL10nFields(
    surveyA: Survey,
    surveyB: Survey,
    differences: SurveyComparisonResult['differences'],
  ): void {
    // Compare title
    differences.l10n.push(
      ...this.l10nComparator.compare('title', surveyA.title, surveyB.title),
    )

    // welcome / thank-you section text is compared by compareSections
    // (welcome/thankYou are no longer embedded L10n fields).

    // Compare dataPolicy.text if it exists
    if (surveyA.dataPolicy?.text || surveyB.dataPolicy?.text) {
      differences.l10n.push(
        ...this.l10nComparator.compare(
          'dataPolicy.text',
          surveyA.dataPolicy?.text || new L10n(),
          surveyB.dataPolicy?.text || new L10n(),
        ),
      )
    }

    // Compare legalNotice.text if it exists
    if (surveyA.legalNotice?.text || surveyB.legalNotice?.text) {
      differences.l10n.push(
        ...this.l10nComparator.compare(
          'legalNotice.text',
          surveyA.legalNotice?.text || new L10n(),
          surveyB.legalNotice?.text || new L10n(),
        ),
      )
    }
  }

  /**
   * Compare configuration objects
   */
  private compareConfigObjects(
    surveyA: Survey,
    surveyB: Survey,
    differences: SurveyComparisonResult['differences'],
  ): void {
    // Compare language config
    differences.fields.push(
      ...this.fieldComparator.compareNestedObject(
        'language',
        surveyA.language,
        surveyB.language,
      ),
    )

    // Compare presentation config
    differences.fields.push(
      ...this.fieldComparator.compareNestedObject(
        'presentation',
        surveyA.presentation,
        surveyB.presentation,
      ),
    )

    // Compare participant config
    differences.fields.push(
      ...this.fieldComparator.compareNestedObject(
        'participant',
        surveyA.participant,
        surveyB.participant,
      ),
    )

    // Compare data config
    differences.fields.push(
      ...this.fieldComparator.compareNestedObject(
        'data',
        surveyA.data,
        surveyB.data,
      ),
    )

    // Compare access config
    differences.fields.push(
      ...this.fieldComparator.compareNestedObject(
        'access',
        surveyA.access,
        surveyB.access,
      ),
    )

    // Compare notify config
    differences.fields.push(
      ...this.fieldComparator.compareNestedObject(
        'notify',
        surveyA.notify,
        surveyB.notify,
      ),
    )

    // Compare schedule config
    differences.fields.push(
      ...this.fieldComparator.compareNestedObject(
        'schedule',
        surveyA.schedule,
        surveyB.schedule,
      ),
    )

    // Compare attributes
    differences.fields.push(
      ...this.fieldComparator.compareNestedObject(
        'attributes',
        surveyA.attributes,
        surveyB.attributes,
      ),
    )
  }
}
