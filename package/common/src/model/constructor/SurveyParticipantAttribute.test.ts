import { SurveyParticipantAttribute } from './SurveyParticipantAttribute'

describe('SurveyParticipantAttribute', () => {
  describe('constructor', () => {
    it('sets all fields from data', () => {
      const createdAt = new Date('2024-01-01')
      const updatedAt = new Date('2024-01-02')
      const attributes = [
        {
          name: 'department',
          required: true,
          internal: false,
          example: 'Sales',
        },
      ]
      const attribute = new SurveyParticipantAttribute({
        _id: 'id1',
        surveyId: 'survey1',
        attributes,
        createdAt,
        updatedAt,
      })

      expect(attribute._id).toBe('id1')
      expect(attribute.surveyId).toBe('survey1')
      expect(attribute.attributes).toEqual(attributes)
      expect(attribute.createdAt).toEqual(createdAt)
      expect(attribute.updatedAt).toEqual(updatedAt)
    })

    it('generates an _id when not provided', () => {
      const attribute = new SurveyParticipantAttribute({
        surveyId: 's1',
      })
      expect(attribute._id).toBeTruthy()
    })

    it('defaults attributes to empty array', () => {
      const attribute = new SurveyParticipantAttribute({
        surveyId: 's1',
      })
      expect(attribute.attributes).toEqual([])
    })
  })

  describe('update', () => {
    it('returns a new instance with merged data', () => {
      const original = new SurveyParticipantAttribute({
        surveyId: 's1',
        attributes: [],
      })
      const newAttrs = [
        { name: 'department', required: true, internal: false, example: null },
      ]

      const updatedAt = original.update({ attributes: newAttrs })

      expect(updatedAt).toBeInstanceOf(SurveyParticipantAttribute)
      expect(updatedAt).not.toBe(original)
      expect(updatedAt.attributes).toEqual(newAttrs)
      expect(updatedAt.surveyId).toBe('s1')
    })

    it('does not mutate the original instance', () => {
      const original = new SurveyParticipantAttribute({
        surveyId: 's1',
        attributes: [],
      })

      original.update({
        attributes: [
          { name: 'division', required: false, internal: false, example: null },
        ],
      })

      expect(original.attributes).toEqual([])
    })
  })
})
