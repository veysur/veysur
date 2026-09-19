import { ServiceSurveyParticipantAttribute } from './ServiceSurveyParticipantAttribute'
import { mockRepoTransaction } from '../../../../test-utils/mockRepoTransaction'

describe('ServiceSurveyParticipantAttribute', () => {
  let service: ServiceSurveyParticipantAttribute
  let mockRepoAttribute: {
    findOne: jest.Mock
    insertOne: jest.Mock
    updateOne: jest.Mock
    getDataSource: jest.Mock
    releaseDataSource: jest.Mock
    transaction: jest.Mock
  }
  let mockRepoAttributeLanguage: {
    find: jest.Mock
    findOne: jest.Mock
    insertOne: jest.Mock
    updateOne: jest.Mock
    updateMany: jest.Mock
  }
  let mockRepoParticipant: { updateMany: jest.Mock }
  let mockDataSource: {
    transactionStart: jest.Mock
    transactionCommit: jest.Mock
    transactionRollback: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceSurveyParticipantAttribute()

    mockDataSource = {
      transactionStart: jest.fn(),
      transactionCommit: jest.fn(),
      transactionRollback: jest.fn(),
    }
    // transactionStart() now returns the lease to run the transaction against - self-reference
    // it here since these mocks don't model the real per-caller lease split.
    mockDataSource.transactionStart.mockResolvedValue(mockDataSource)

    mockRepoAttribute = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      getDataSource: jest.fn().mockResolvedValue(mockDataSource),
      releaseDataSource: jest.fn(),
      transaction: jest.fn(),
    }
    mockRepoAttribute.transaction = mockRepoTransaction(mockRepoAttribute)
    mockRepoAttributeLanguage = {
      find: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
    }
    mockRepoParticipant = {
      updateMany: jest.fn(),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveyParticipantAttribute: mockRepoAttribute,
        surveyParticipantAttributeLanguage: mockRepoAttributeLanguage,
        surveyParticipant: mockRepoParticipant,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)
  })

  describe('list', () => {
    test('returns system attributes and custom attributes with language data merged', async () => {
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        surveyId: 's1',
        projectId: 'p1',
        attributes: [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
          { name: 'region', required: false, internal: false, example: null },
        ],
      })
      mockRepoAttributeLanguage.find.mockResolvedValue([
        { languageCode: 'en', data: { department: { label: 'Department' } } },
      ])

      const result = await service.list({ surveyId: 's1', projectId: 'p1' })

      expect(
        result.systemAttributes.find((a) => a.name === 'nameFirst'),
      ).toBeDefined()
      expect(result.attributes).toHaveLength(2)
      expect(result.attributes[0].languages).toEqual({
        en: { label: 'Department' },
      })
      expect(result.attributes[1].languages).toEqual({})
    })

    test('returns empty attributes when no doc exists', async () => {
      mockRepoAttribute.findOne.mockResolvedValue(null)
      mockRepoAttributeLanguage.find.mockResolvedValue([])

      const result = await service.list({ surveyId: 's1', projectId: 'p1' })

      expect(result.attributes).toHaveLength(0)
    })
  })

  describe('create', () => {
    test('rejects an invalid name', async () => {
      await expect(
        service.create({
          surveyId: 's1',
          projectId: 'p1',
          attribute: { name: 'nameFirst' },
        }),
      ).rejects.toThrow()

      expect(mockRepoAttribute.insertOne).not.toHaveBeenCalled()
      expect(mockRepoAttribute.updateOne).not.toHaveBeenCalled()
    })

    test('rejects a duplicate name', async () => {
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        attributes: [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
        ],
      })

      await expect(
        service.create({
          surveyId: 's1',
          projectId: 'p1',
          attribute: { name: 'department' },
        }),
      ).rejects.toThrow()

      expect(mockRepoAttribute.insertOne).not.toHaveBeenCalled()
      expect(mockRepoAttribute.updateOne).not.toHaveBeenCalled()
    })

    test('appends to existing doc when one exists', async () => {
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        attributes: [
          { name: 'region', required: false, internal: false, example: null },
        ],
      })

      const result = await service.create({
        surveyId: 's1',
        projectId: 'p1',
        attribute: { name: 'department' },
      })

      expect(result.name).toBe('department')
      expect(mockRepoAttribute.updateOne).toHaveBeenCalledWith(
        { _id: 'doc1' },
        {
          $set: {
            attributes: expect.arrayContaining([
              expect.objectContaining({ name: 'department' }),
            ]),
            updatedAt: expect.any(Date),
          },
        },
        expect.objectContaining({ context: expect.any(Object) }),
      )
      expect(mockRepoAttribute.insertOne).not.toHaveBeenCalled()
    })

    test('inserts a new doc when none exists', async () => {
      mockRepoAttribute.findOne.mockResolvedValue(null)

      const result = await service.create({
        surveyId: 's1',
        projectId: 'p1',
        attribute: { name: 'department' },
      })

      expect(result.name).toBe('department')
      expect(mockRepoAttribute.insertOne).toHaveBeenCalled()
      expect(mockRepoAttribute.updateOne).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    test('rejects attempts to change the name', async () => {
      await expect(
        service.update({
          surveyId: 's1',
          projectId: 'p1',
          attributeName: 'department',
          attribute: { name: 'newName' },
        }),
      ).rejects.toThrow()

      expect(mockRepoAttribute.updateOne).not.toHaveBeenCalled()
    })

    test('throws when the attribute does not exist', async () => {
      mockRepoAttribute.findOne.mockResolvedValue(null)

      await expect(
        service.update({
          surveyId: 's1',
          projectId: 'p1',
          attributeName: 'missing',
          attribute: { required: true },
        }),
      ).rejects.toThrow()
    })

    test('updates required/internal/example in the attributes array', async () => {
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        attributes: [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
        ],
      })

      await service.update({
        surveyId: 's1',
        projectId: 'p1',
        attributeName: 'department',
        attribute: { required: true, internal: true, example: 'Sales' },
      })

      expect(mockRepoAttribute.updateOne).toHaveBeenCalledWith(
        { _id: 'doc1' },
        {
          $set: expect.objectContaining({
            attributes: [
              {
                name: 'department',
                required: true,
                internal: true,
                example: 'Sales',
              },
            ],
          }),
        },
        expect.objectContaining({ context: expect.any(Object) }),
      )
    })
  })

  describe('updateLanguage', () => {
    test('throws when the attribute does not exist', async () => {
      mockRepoAttribute.findOne.mockResolvedValue(null)

      await expect(
        service.updateLanguage({
          surveyId: 's1',
          projectId: 'p1',
          attributeName: 'missing',
          languageCode: 'en',
          data: { label: 'Department' },
        }),
      ).rejects.toThrow()
    })

    test('inserts a new language doc when none exists', async () => {
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        attributes: [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
        ],
      })
      mockRepoAttributeLanguage.findOne.mockResolvedValue(null)

      await service.updateLanguage({
        surveyId: 's1',
        projectId: 'p1',
        attributeName: 'department',
        languageCode: 'en',
        data: { label: 'Department' },
      })

      expect(mockRepoAttributeLanguage.insertOne).toHaveBeenCalled()
      expect(mockRepoAttributeLanguage.updateOne).not.toHaveBeenCalled()
    })

    test('updates the named key in an existing language doc', async () => {
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        attributes: [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
        ],
      })
      mockRepoAttributeLanguage.findOne.mockResolvedValue({
        _id: 'l1',
        data: {},
      })

      await service.updateLanguage({
        surveyId: 's1',
        projectId: 'p1',
        attributeName: 'department',
        languageCode: 'en',
        data: { label: 'Department' },
      })

      expect(mockRepoAttributeLanguage.updateOne).toHaveBeenCalledWith(
        { _id: 'l1' },
        {
          $set: {
            'data.department': { label: 'Department' },
            updatedAt: expect.any(Date),
          },
        },
        expect.objectContaining({ context: expect.any(Object) }),
      )
      expect(mockRepoAttributeLanguage.insertOne).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    test('throws when the attribute does not exist', async () => {
      mockRepoAttribute.findOne.mockResolvedValue(null)

      await expect(
        service.delete({
          surveyId: 's1',
          projectId: 'p1',
          attributeName: 'missing',
        }),
      ).rejects.toThrow()

      expect(mockRepoAttribute.updateOne).not.toHaveBeenCalled()
    })

    test('removes the definition from the array and cascades unsets', async () => {
      // cspell:ignore unsets
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        attributes: [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
          { name: 'region', required: false, internal: false, example: null },
        ],
      })

      await service.delete({
        surveyId: 's1',
        projectId: 'p1',
        attributeName: 'department',
      })

      expect(mockRepoAttribute.updateOne).toHaveBeenCalledWith(
        { _id: 'doc1' },
        {
          $set: {
            attributes: [
              {
                name: 'region',
                required: false,
                internal: false,
                example: null,
              },
            ],
            updatedAt: expect.any(Date),
          },
        },
        expect.objectContaining({ context: expect.any(Object) }),
      )
      expect(mockRepoAttributeLanguage.updateMany).toHaveBeenCalledWith(
        { surveyId: 's1' },
        { $unset: { 'data.department': '' } },
        expect.objectContaining({ context: expect.any(Object) }),
      )
      expect(mockRepoParticipant.updateMany).toHaveBeenCalledWith(
        { surveyId: 's1' },
        { $unset: { 'attributes.department': '' } },
        expect.objectContaining({ context: expect.any(Object) }),
      )
      expect(mockDataSource.transactionCommit).toHaveBeenCalled()
    })

    test('rolls back the transaction if a cascade step throws', async () => {
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        attributes: [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
        ],
      })
      mockRepoParticipant.updateMany.mockRejectedValue(new Error('boom'))

      await expect(
        service.delete({
          surveyId: 's1',
          projectId: 'p1',
          attributeName: 'department',
        }),
      ).rejects.toThrow('boom')

      expect(mockDataSource.transactionRollback).toHaveBeenCalled()
      expect(mockDataSource.transactionCommit).not.toHaveBeenCalled()
    })
  })

  describe('rename', () => {
    test('rejects an invalid new name', async () => {
      await expect(
        service.rename({
          surveyId: 's1',
          projectId: 'p1',
          attributeName: 'department',
          newName: 'nameFirst',
        }),
      ).rejects.toThrow()

      expect(mockRepoAttribute.updateOne).not.toHaveBeenCalled()
    })

    test('throws when the attribute does not exist', async () => {
      mockRepoAttribute.findOne.mockResolvedValue(null)

      await expect(
        service.rename({
          surveyId: 's1',
          projectId: 'p1',
          attributeName: 'missing',
          newName: 'region',
        }),
      ).rejects.toThrow()
    })

    test('rejects a duplicate name', async () => {
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        attributes: [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
          { name: 'region', required: false, internal: false, example: null },
        ],
      })

      await expect(
        service.rename({
          surveyId: 's1',
          projectId: 'p1',
          attributeName: 'department',
          newName: 'region',
        }),
      ).rejects.toThrow()

      expect(mockRepoAttribute.updateOne).not.toHaveBeenCalled()
    })

    test('renames definition, cascades to language docs and participants', async () => {
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        attributes: [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
        ],
      })

      await service.rename({
        surveyId: 's1',
        projectId: 'p1',
        attributeName: 'department',
        newName: 'division',
      })

      expect(mockRepoAttribute.updateOne).toHaveBeenCalledWith(
        { _id: 'doc1' },
        {
          $set: {
            attributes: [
              {
                name: 'division',
                required: false,
                internal: false,
                example: null,
              },
            ],
            updatedAt: expect.any(Date),
          },
        },
        expect.objectContaining({ context: expect.any(Object) }),
      )
      expect(mockRepoAttributeLanguage.updateMany).toHaveBeenCalledWith(
        { surveyId: 's1' },
        { $rename: { 'data.department': 'data.division' } },
        expect.objectContaining({ context: expect.any(Object) }),
      )
      expect(mockRepoParticipant.updateMany).toHaveBeenCalledWith(
        { surveyId: 's1' },
        { $rename: { 'attributes.department': 'attributes.division' } },
        expect.objectContaining({ context: expect.any(Object) }),
      )
      expect(mockDataSource.transactionCommit).toHaveBeenCalled()
    })

    test('is a no-op when the new name matches the current name', async () => {
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        attributes: [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
        ],
      })

      await service.rename({
        surveyId: 's1',
        projectId: 'p1',
        attributeName: 'department',
        newName: 'department',
      })

      expect(mockRepoAttribute.updateOne).not.toHaveBeenCalled()
      expect(mockRepoParticipant.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('reorder', () => {
    test('rebuilds the attributes array in the given name order', async () => {
      mockRepoAttribute.findOne.mockResolvedValue({
        _id: 'doc1',
        attributes: [
          {
            name: 'department',
            required: false,
            internal: false,
            example: null,
          },
          { name: 'region', required: false, internal: false, example: null },
        ],
      })

      await service.reorder({
        surveyId: 's1',
        projectId: 'p1',
        orderedAttributeNames: ['region', 'department'],
      })

      expect(mockRepoAttribute.updateOne).toHaveBeenCalledWith(
        { _id: 'doc1' },
        {
          $set: {
            attributes: [
              {
                name: 'region',
                required: false,
                internal: false,
                example: null,
              },
              {
                name: 'department',
                required: false,
                internal: false,
                example: null,
              },
            ],
            updatedAt: expect.any(Date),
          },
        },
        expect.objectContaining({ context: expect.any(Object) }),
      )
    })

    test('is a no-op when no doc exists', async () => {
      mockRepoAttribute.findOne.mockResolvedValue(null)

      await service.reorder({
        surveyId: 's1',
        projectId: 'p1',
        orderedAttributeNames: ['department'],
      })

      expect(mockRepoAttribute.updateOne).not.toHaveBeenCalled()
    })
  })
})
