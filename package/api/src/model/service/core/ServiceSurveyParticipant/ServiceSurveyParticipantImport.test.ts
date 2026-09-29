import { DataSourceContext } from '@datacapy/om'
import {
  ServiceSurveyParticipantImport,
  ImportRow,
} from './ServiceSurveyParticipantImport'
import { asPrivate } from 'test-utils/asPrivate'

type ServicePrivateOverrides = {
  normalizeHeaders: (
    row: Record<string, string>,
    names: Set<string>,
  ) => ImportRow
  setParticipantContext: (
    participant: ImportRow,
    surveyId: string,
    defaultLanguage: string,
    createdById: string,
  ) => void
  createNewParticipant: (
    participant: ImportRow,
    surveyId: string,
    context: DataSourceContext,
    repoSurveyParticipant: {
      findOne: jest.Mock
      create: jest.Mock
    },
    repoSurvey: unknown,
    repoSettingSurvey: unknown,
  ) => Promise<void>
  updateExistingParticipant: (
    existingParticipant: { _id: string; token: string; attributes?: object },
    participant: ImportRow,
    surveyId: string,
    context: DataSourceContext,
    repoSurveyParticipant: {
      updateOne: jest.Mock
    },
  ) => Promise<void>
}

describe('ServiceSurveyParticipantImport', () => {
  let service: ServiceSurveyParticipantImport

  beforeEach(() => {
    service = new ServiceSurveyParticipantImport()
  })

  describe('normalizeHeaders', () => {
    const normalize = (row: Record<string, string>, names: string[]) =>
      asPrivate<ServiceSurveyParticipantImport, ServicePrivateOverrides>(
        service,
      ).normalizeHeaders(row, new Set(names))

    test('maps known columns and collects recognised custom attribute columns', () => {
      const result = normalize(
        {
          'First Name': 'Jane',
          Email: 'jane@example.com',
          department: 'Sales',
        },
        ['department'],
      )

      expect(result.nameFirst).toBe('Jane')
      expect(result.email).toBe('jane@example.com')
      expect(result.attributes).toEqual({ department: 'Sales' })
    })

    test('ignores columns that are not recognised custom attributes', () => {
      const result = normalize(
        {
          'First Name': 'Jane',
          unknownColumn: 'value',
        },
        ['department'],
      )

      expect(result.attributes).toBeUndefined()
    })

    test('truncates attribute values to the maximum length', () => {
      const longValue = 'x'.repeat(300)
      const result = normalize({ department: longValue }, ['department'])

      expect(result.attributes.department).toHaveLength(256)
    })

    test('rejects custom attribute columns with invalid names', () => {
      const result = normalize({ 'invalid name': 'value' }, ['invalid name'])

      expect(result.attributes).toBeUndefined()
    })

    test('ignores an Email Status column entirely - it has no effect on send gating', () => {
      const result = normalize(
        {
          'First Name': 'Jane',
          Email: 'jane@example.com',
          'Email Status': 'verified',
          emailStatus: 'verified',
          email_status: 'verified',
        },
        [],
      )

      expect(result).not.toHaveProperty('emailStatus')
    })
  })

  describe('createNewParticipant — emailVerifyToken', () => {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: 'project-1' },
    })

    test('always generates a fresh server-side emailVerifyToken, ignoring any CSV value', async () => {
      const repoSurveyParticipant = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
      }

      await asPrivate<ServiceSurveyParticipantImport, ServicePrivateOverrides>(
        service,
      ).createNewParticipant(
        {
          nameFirst: 'Jane',
          nameLast: 'Doe',
          email: 'jane@example.com',
          language: 'en',
          token: 'ABC123',
          // A CSV column happening to be named emailVerifyToken cannot reach
          // here (ImportRow/COLUMN_MAPPINGS have no such field), but even if
          // it did, createNewParticipant must never use it.
          ...({ emailVerifyToken: 'from-csv' } as Partial<ImportRow>),
        },
        'survey-1',
        context,
        repoSurveyParticipant,
        {} as never,
        {} as never,
      )

      expect(repoSurveyParticipant.create).toHaveBeenCalledTimes(1)
      const [createdParticipant] = repoSurveyParticipant.create.mock.calls[0]
      expect(createdParticipant.emailVerifyToken).toEqual(expect.any(String))
      expect(createdParticipant.emailVerifyToken).not.toBe('from-csv')
    })
  })

  describe('updateExistingParticipant — never touches emailVerifyToken or emailStatus', () => {
    test('updateData sent to the repo has no emailVerifyToken or emailStatus key', async () => {
      const repoSurveyParticipant = {
        updateOne: jest.fn().mockResolvedValue(undefined),
      }
      const context = DataSourceContext.fromDataSources({
        project: { lookupKey: 'project-1' },
      })

      await asPrivate<ServiceSurveyParticipantImport, ServicePrivateOverrides>(
        service,
      ).updateExistingParticipant(
        { _id: 'participant-1', token: 'ABC123' },
        {
          nameFirst: 'Jane',
          nameLast: 'Doe',
          // A CSV column happening to be named emailStatus cannot reach here
          // (ImportRow/COLUMN_MAPPINGS have no such field), but even if it
          // did, updateExistingParticipant must never persist it - an
          // existing participant's emailStatus is system-derived only.
          ...({ emailStatus: 'invalid' } as Partial<ImportRow>),
        },
        'survey-1',
        context,
        repoSurveyParticipant,
      )

      expect(repoSurveyParticipant.updateOne).toHaveBeenCalledTimes(1)
      const [, updatePayload] = repoSurveyParticipant.updateOne.mock.calls[0]
      expect(updatePayload.$set).not.toHaveProperty('emailVerifyToken')
      expect(updatePayload.$set).not.toHaveProperty('emailStatus')
    })
  })
})
