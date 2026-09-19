import { Survey } from '../../constructor/Survey'
import { L10n } from '../../constructor/L10n'
import { ConditionReferenceIndex } from './ConditionReferenceIndex'

describe('ConditionReferenceIndex', () => {
  const baseSurvey = () =>
    new Survey({
      _id: 's1',
      sections: [{ _id: 'g1', code: 'G1', name: { en: 'Group 1' } }],
      elements: [
        {
          _id: 'q1',
          sectionId: 'g1',
          code: 'Q001',
          text: { en: 'Q1' },
          answerOptions: [
            { _id: 'a1', code: 'A001', label: new L10n({ en: 'A1' }) },
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
        {
          _id: 'q3',
          sectionId: 'g1',
          code: 'Q003',
          text: { en: 'Q3' },
          condition: 'Q001',
          conditionReferences: ['Q001'],
        },
      ],
    })

  it('matches exact code references', () => {
    const index = ConditionReferenceIndex.build(baseSurvey())
    const owners = index.findReferencingOwners('Q001')
    expect(owners.map((o) => o.entityId)).toContain('q3')
  })

  it('matches dot-prefixed child references', () => {
    const index = ConditionReferenceIndex.build(baseSurvey())
    const owners = index.findReferencingOwners('Q001')
    expect(owners.map((o) => o.entityId)).toContain('q2')
  })

  it('does not match unrelated codes', () => {
    const index = ConditionReferenceIndex.build(baseSurvey())
    expect(index.findReferencingOwners('Q999')).toEqual([])
  })

  it('matches matrix cell references by subquestion suffix', () => {
    const survey = new Survey({
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

    const index = ConditionReferenceIndex.build(survey)
    const owners = index.findReferencingOwnersBySubquestion('Q001', 'S001')
    expect(owners.map((o) => o.entityId)).toEqual(['q2'])
  })

  it('matches matrix cell references by answer option suffix', () => {
    const survey = new Survey({
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

    const index = ConditionReferenceIndex.build(survey)
    const owners = index.findReferencingOwnersByAnswerOption('Q001', 'A001')
    expect(owners.map((o) => o.entityId)).toEqual(['q2'])
  })

  it('falls back to parsing the condition when conditionReferences is null', () => {
    const survey = new Survey({
      _id: 's1',
      sections: [{ _id: 'g1', code: 'G1', name: { en: 'Group 1' } }],
      elements: [
        {
          _id: 'q1',
          sectionId: 'g1',
          code: 'Q001',
          text: { en: 'Q1' },
        },
        {
          _id: 'q2',
          sectionId: 'g1',
          code: 'Q002',
          text: { en: 'Q2' },
          condition: 'Q001',
          conditionReferences: null,
        },
      ],
    })

    const index = ConditionReferenceIndex.build(survey)
    expect(index.findReferencingOwners('Q001').map((o) => o.entityId)).toEqual([
      'q2',
    ])
  })
})
