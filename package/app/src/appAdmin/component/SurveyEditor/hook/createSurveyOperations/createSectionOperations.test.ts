import { Survey, Patch } from 'veysur-common'

import { createSectionOperations } from './createSectionOperations'

describe('createSectionOperations', () => {
  let surveyState: Survey
  let patchBuffer: Patch[]

  beforeEach(() => {
    surveyState = new Survey({
      _id: 'survey1',
      createdById: 'user1',
      title: { en: 'Test Survey' },
    })
    patchBuffer = []
  })

  const setUpOperations = (
    update: jest.Mock<Survey, [Survey, Record<string, unknown>]>,
    setProperty: jest.Mock<Survey, [Survey, string, unknown]>,
  ) => {
    const updateSurveyState = (updater: (s: Survey) => Survey) => {
      surveyState = updater(surveyState)
    }
    const bufferPatches = (patches: Patch[]) => {
      patchBuffer.push(...patches)
    }
    const validateAndBuffer = ({ patches }: { patches: Patch[] }) => {
      bufferPatches(patches)
    }

    return createSectionOperations(
      {
        updateSurveyState,
        bufferPatches,
        setSurveyFocus: jest.fn(),
        validateAndBuffer,
      },
      { section: 'testSection', update, setProperty },
    )
  }

  test('update calls the configured update function and buffers a survey update patch', () => {
    const update = jest.fn<Survey, [Survey, Record<string, unknown>]>((s) => s)
    const setProperty = jest.fn<Survey, [Survey, string, unknown]>((s) => s)
    const operations = setUpOperations(update, setProperty)

    operations.update({ foo: 'bar' })

    expect(update).toHaveBeenCalledWith(expect.any(Survey), { foo: 'bar' })
    expect(patchBuffer).toHaveLength(1)
    expect(patchBuffer[0]).toMatchObject({
      type: 'survey',
      action: 'update',
      id: 'survey1',
      data: { testSection: { foo: 'bar' } },
    })
  })

  test('updateSetting calls the configured setProperty function and buffers a dotted-key patch', () => {
    const update = jest.fn<Survey, [Survey, Record<string, unknown>]>((s) => s)
    const setProperty = jest.fn<Survey, [Survey, string, unknown]>((s) => s)
    const operations = setUpOperations(update, setProperty)

    operations.updateSetting('someKey', 'someValue')

    expect(setProperty).toHaveBeenCalledWith(
      expect.any(Survey),
      'someKey',
      'someValue',
    )
    expect(patchBuffer).toHaveLength(1)
    expect(patchBuffer[0]).toMatchObject({
      type: 'survey',
      action: 'update',
      id: 'survey1',
      data: { 'testSection.someKey': 'someValue' },
    })
  })
})
