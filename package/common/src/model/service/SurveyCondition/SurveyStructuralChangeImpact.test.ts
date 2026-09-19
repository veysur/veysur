import { Survey } from '../../constructor/Survey'
import { L10n } from '../../constructor/L10n'
import { SurveyStructuralChangeImpact } from './SurveyStructuralChangeImpact'

describe('SurveyStructuralChangeImpact', () => {
  const surveyWithAnswerOption = () =>
    new Survey({
      _id: 's1',
      sections: [{ _id: 'g1', code: 'G1', name: { en: 'Group 1' } }],
      elements: [
        {
          _id: 'q1',
          sectionId: 'g1',
          code: 'Q001',
          type: 'checkbox',
          text: { en: 'Q1' },
          answerOptions: [
            { _id: 'a1', code: 'A001', label: new L10n({ en: 'A1' }) },
            { _id: 'a2', code: 'A002', label: new L10n({ en: 'A2' }) },
          ],
        },
        {
          _id: 'q2',
          sectionId: 'g1',
          code: 'Q002',
          text: { en: 'Q2' },
          condition: 'Q001.A001',
          conditionReferences: ['Q001.A001'],
        },
      ],
    })

  describe('checkAnswerOptionRemoval', () => {
    it('reports impact when the removed option is referenced', () => {
      const result = SurveyStructuralChangeImpact.checkAnswerOptionRemoval(
        surveyWithAnswerOption(),
        'q1',
        'A001',
      )
      expect(result.impacted).toBe(true)
      expect(result.affectedConditions[0].entityId).toBe('q2')
    })

    it('reports no impact when the removed option is unreferenced', () => {
      const result = SurveyStructuralChangeImpact.checkAnswerOptionRemoval(
        surveyWithAnswerOption(),
        'q1',
        'A002',
      )
      expect(result.impacted).toBe(false)
    })
  })

  describe('checkSubquestionRemoval', () => {
    const surveyWithMatrix = () =>
      new Survey({
        _id: 's1',
        sections: [{ _id: 'g1', code: 'G1', name: { en: 'Group 1' } }],
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            code: 'Q001',
            type: 'matrixRadio',
            text: { en: 'Q1' },
            answerOptions: [
              { _id: 'a1', code: 'A001', label: new L10n({ en: 'A1' }) },
            ],
            subquestions: [
              { _id: 'sq1', code: 'S001', text: new L10n({ en: 'Row1' }) },
              { _id: 'sq2', code: 'S002', text: new L10n({ en: 'Row2' }) },
            ],
          },
          {
            _id: 'q2',
            sectionId: 'g1',
            code: 'Q002',
            text: { en: 'Q2' },
            condition: 'Q001.S001.A001',
            conditionReferences: ['Q001.S001.A001'],
          },
        ],
      })

    it('reports impact when the removed subquestion is referenced', () => {
      const result = SurveyStructuralChangeImpact.checkSubquestionRemoval(
        surveyWithMatrix(),
        'q1',
        'sq1',
      )
      expect(result.impacted).toBe(true)
    })

    it('reports no impact when the removed subquestion is unreferenced', () => {
      const result = SurveyStructuralChangeImpact.checkSubquestionRemoval(
        surveyWithMatrix(),
        'q1',
        'sq2',
      )
      expect(result.impacted).toBe(false)
    })

    it('reports impact from checkAnswerOptionRemoval when a matrix answer option is referenced (Q001.S001.A001 puts the answer option code last, not prefix-matchable)', () => {
      const result = SurveyStructuralChangeImpact.checkAnswerOptionRemoval(
        surveyWithMatrix(),
        'q1',
        'A001',
      )
      expect(result.impacted).toBe(true)
      expect(result.affectedConditions[0].entityId).toBe('q2')
    })
  })

  describe('checkQuestionTypeChange', () => {
    it('reports impact when the type change removes a referenced answer option', () => {
      const result = SurveyStructuralChangeImpact.checkQuestionTypeChange(
        surveyWithAnswerOption(),
        'q1',
        'text',
      )
      expect(result.impacted).toBe(true)
    })

    it('reports no impact for an unrelated attribute-only change', () => {
      const survey = surveyWithAnswerOption()
      const result = SurveyStructuralChangeImpact.checkQuestionTypeChange(
        survey,
        'q1',
        survey.elements.questions().find((q) => q._id === 'q1')!.type,
      )
      expect(result.impacted).toBe(false)
    })

    it.each(['starRating', 'point5', 'point10', 'yesNo'])(
      'reports impact when changing to a fixed-scale preset type with no addressable answer options (%s)',
      (presetType) => {
        const result = SurveyStructuralChangeImpact.checkQuestionTypeChange(
          surveyWithAnswerOption(),
          'q1',
          presetType,
        )
        expect(result.impacted).toBe(true)
      },
    )

    it('reports impact when changing between two fixed-scale preset types drops a referenced predefined option', () => {
      // Previously unreachable: yesNo wasn't referenceable at all, so a
      // condition referencing its predefined option couldn't exist.
      const survey = new Survey({
        _id: 's1',
        sections: [{ _id: 'g1', code: 'G1', name: { en: 'Group 1' } }],
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            code: 'Q001',
            type: 'yesNo',
            text: { en: 'Q1' },
          },
          {
            _id: 'q2',
            sectionId: 'g1',
            code: 'Q002',
            text: { en: 'Q2' },
            condition: 'Q001.YES',
            conditionReferences: ['Q001.YES'],
          },
        ],
      })

      const result = SurveyStructuralChangeImpact.checkQuestionTypeChange(
        survey,
        'q1',
        'starRating',
      )
      expect(result.impacted).toBe(true)
    })

    it('reports no impact when changing from yesNo to starRating without any referencing condition', () => {
      const survey = new Survey({
        _id: 's1',
        sections: [{ _id: 'g1', code: 'G1', name: { en: 'Group 1' } }],
        elements: [
          {
            _id: 'q1',
            sectionId: 'g1',
            code: 'Q001',
            type: 'yesNo',
            text: { en: 'Q1' },
          },
        ],
      })

      const result = SurveyStructuralChangeImpact.checkQuestionTypeChange(
        survey,
        'q1',
        'starRating',
      )
      expect(result.impacted).toBe(false)
    })
  })

  describe('checkQuestionMove', () => {
    const surveyForMove = () =>
      new Survey({
        _id: 's1',
        sections: [{ _id: 'g1', code: 'G1', name: { en: 'Group 1' } }],
        elements: [
          { _id: 'q1', sectionId: 'g1', code: 'Q001', text: { en: 'Q1' } },
          {
            _id: 'q2',
            sectionId: 'g1',
            code: 'Q002',
            text: { en: 'Q2' },
            condition: 'Q001',
            conditionReferences: ['Q001'],
          },
          { _id: 'q3', sectionId: 'g1', code: 'Q003', text: { en: 'Q3' } },
        ],
      })

    it('reports impact when moving the referenced question past its dependent', () => {
      const result = SurveyStructuralChangeImpact.checkQuestionMove(
        surveyForMove(),
        'q1',
        'g1',
        2,
      )
      expect(result.impacted).toBe(true)
    })

    it('reports no impact for a harmless move that keeps ordering intact', () => {
      const result = SurveyStructuralChangeImpact.checkQuestionMove(
        surveyForMove(),
        'q3',
        'g1',
        0,
      )
      expect(result.impacted).toBe(false)
    })
  })

  describe('checkQuestionGroupMove', () => {
    const surveyForGroupMove = () =>
      new Survey({
        _id: 's1',
        sections: [
          { _id: 'g1', code: 'G1', name: { en: 'Group 1' } },
          { _id: 'g2', code: 'G2', name: { en: 'Group 2' } },
        ],
        elements: [
          { _id: 'q1', sectionId: 'g1', code: 'Q001', text: { en: 'Q1' } },
          {
            _id: 'q2',
            sectionId: 'g2',
            code: 'Q002',
            text: { en: 'Q2' },
            condition: 'Q001',
            conditionReferences: ['Q001'],
          },
        ],
      })

    it('reports impact when moving the referenced group past its dependent group', () => {
      const result = SurveyStructuralChangeImpact.checkQuestionGroupMove(
        surveyForGroupMove(),
        'g1',
        1,
      )
      expect(result.impacted).toBe(true)
    })

    it('reports no impact when moving an unrelated group', () => {
      const survey = new Survey({
        _id: 's1',
        sections: [
          { _id: 'g1', code: 'G1', name: { en: 'Group 1' } },
          { _id: 'g2', code: 'G2', name: { en: 'Group 2' } },
          { _id: 'g3', code: 'G3', name: { en: 'Group 3' } },
        ],
        elements: [
          { _id: 'q1', sectionId: 'g1', code: 'Q001', text: { en: 'Q1' } },
          {
            _id: 'q2',
            sectionId: 'g2',
            code: 'Q002',
            text: { en: 'Q2' },
            condition: 'Q001',
            conditionReferences: ['Q001'],
          },
          { _id: 'q3', sectionId: 'g3', code: 'Q003', text: { en: 'Q3' } },
        ],
      })

      const result = SurveyStructuralChangeImpact.checkQuestionGroupMove(
        survey,
        'g3',
        0,
      )
      expect(result.impacted).toBe(false)
    })
  })
})
