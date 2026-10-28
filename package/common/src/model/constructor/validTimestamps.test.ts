import { SettingSurveyBase } from './SettingSurvey/SettingSurveyBase'
import { SurveyBase } from './Survey/SurveyBase'
import { SurveyParticipant } from './SurveyParticipant'
import { SurveyPublication } from './SurveyPublication'
import { SurveySnapshotPartial } from './SurveySnapshotPartial'

const createdAtOnly = { createdAt: new Date('2026-01-01T00:00:00Z') }

const constructors: Array<[string, (data: object) => { updatedAt: Date }]> = [
  ['SurveyPublication', (data) => new SurveyPublication(data)],
  ['SurveySnapshotPartial', (data) => new SurveySnapshotPartial(data)],
  ['SurveyParticipant', (data) => new SurveyParticipant(data)],
  ['SurveyBase', (data) => new SurveyBase(data)],
  ['SettingSurveyBase', (data) => new SettingSurveyBase(data)],
]

describe.each(constructors)('%s timestamps', (_name, build) => {
  test('updatedAt is a valid date when only createdAt is supplied', () => {
    const entity = build(createdAtOnly)
    expect(Number.isNaN(entity.updatedAt.getTime())).toBe(false)
  })

  test('updatedAt keeps a supplied value', () => {
    const updatedAt = new Date('2026-02-02T00:00:00Z')
    const entity = build({ ...createdAtOnly, updatedAt })
    expect(entity.updatedAt.getTime()).toBe(updatedAt.getTime())
  })
})
