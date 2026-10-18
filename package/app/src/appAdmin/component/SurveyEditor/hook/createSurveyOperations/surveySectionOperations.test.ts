import { Survey, Patch } from 'veysur-common'

import {
  createSurveyAccessOperations,
  createSurveyDataOperations,
  createSurveyParticipantOperations,
  createSurveyPresentationOperations,
  createSurveyScheduleOperations,
} from './surveySectionOperations'
import { OperationDependencies } from './type'

type SectionCase = {
  name: string
  createOperations: (
    deps: OperationDependencies,
  ) => Record<string, (...args: never[]) => void>
  updateKey: string
  settingKey: string
  patchDataKey: string
}

const cases: SectionCase[] = [
  {
    name: 'access',
    createOperations: createSurveyAccessOperations,
    updateKey: 'updateSurveyAccess',
    settingKey: 'updateSurveyAccessSetting',
    patchDataKey: 'access',
  },
  {
    name: 'data',
    createOperations: createSurveyDataOperations,
    updateKey: 'updateSurveyData',
    settingKey: 'updateSurveyDataSetting',
    patchDataKey: 'data',
  },
  {
    name: 'participant',
    createOperations: createSurveyParticipantOperations,
    updateKey: 'updateSurveyParticipant',
    settingKey: 'updateSurveyParticipantSetting',
    patchDataKey: 'participant',
  },
  {
    name: 'presentation',
    createOperations: createSurveyPresentationOperations,
    updateKey: 'updateSurveyPresentation',
    settingKey: 'updateSurveyPresentationSetting',
    patchDataKey: 'presentation',
  },
  {
    name: 'schedule',
    createOperations: createSurveyScheduleOperations,
    updateKey: 'updateSurveySchedule',
    settingKey: 'updateSurveyScheduleSetting',
    patchDataKey: 'schedule',
  },
]

describe.each(cases)(
  '$name section operations',
  ({ createOperations, updateKey, settingKey, patchDataKey }) => {
    let surveyState: Survey
    let patchBuffer: Patch[]
    let operations: Record<string, (...args: never[]) => void>

    beforeEach(() => {
      surveyState = new Survey({
        _id: 'survey1',
        createdById: 'user1',
        title: { en: 'Test Survey' },
      })
      patchBuffer = []

      const updateSurveyState = (updater: (s: Survey) => Survey) => {
        surveyState = updater(surveyState)
      }
      const bufferPatches = (patches: Patch[]) => {
        patchBuffer.push(...patches)
      }
      const validateAndBuffer = ({ patches }: { patches: Patch[] }) => {
        bufferPatches(patches)
      }

      operations = createOperations({
        updateSurveyState,
        bufferPatches,
        setSurveyFocus: jest.fn(),
        validateAndBuffer,
      })
    })

    test(`${updateKey} updates the survey and buffers a matching patch`, () => {
      ;(operations[updateKey] as (updates: Record<string, unknown>) => void)({
        note: 'hello',
      })

      expect(patchBuffer).toHaveLength(1)
      expect(patchBuffer[0]).toMatchObject({
        type: 'survey',
        action: 'update',
        id: 'survey1',
        data: { [patchDataKey]: { note: 'hello' } },
      })
    })

    test(`${settingKey} updates a single property and buffers a dotted-key patch`, () => {
      ;(operations[settingKey] as (key: string, value: unknown) => void)(
        'someKey',
        'someValue',
      )

      expect(patchBuffer).toHaveLength(1)
      expect(patchBuffer[0]).toMatchObject({
        type: 'survey',
        action: 'update',
        id: 'survey1',
        data: { [`${patchDataKey}.someKey`]: 'someValue' },
      })
    })
  },
)
