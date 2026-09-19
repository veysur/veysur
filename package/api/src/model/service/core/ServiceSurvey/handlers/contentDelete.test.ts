import { Patch } from 'veysur-common'

import { handleContentDelete } from './contentDelete'
import { buildPatchContext } from 'test-utils/buildPatchContext'

describe('handleContentDelete', () => {
  let removeEntityFields: jest.Mock
  let deleteOne: jest.Mock

  const buildContext = (findOneResult: unknown = null) => {
    deleteOne = jest.fn().mockResolvedValue(undefined)
    const built = buildPatchContext({
      repos: {
        repoSurveyElement: {
          findOne: jest.fn().mockResolvedValue(findOneResult),
          deleteOne,
        },
      },
    })
    removeEntityFields = built.l10n.removeEntityFields
    return built.ctx
  }

  const patch: Patch = {
    type: 'content',
    action: 'delete',
    id: 'c1',
    data: null,
  }

  it('removes the language fields then deletes the row', async () => {
    const ctx = buildContext({ _id: 'c1' })

    await handleContentDelete(patch, ctx)

    expect(removeEntityFields).toHaveBeenCalledWith('survey-1', 'project-1', [
      'elements.c1',
    ])
    expect(deleteOne).toHaveBeenCalledWith(
      { _id: 'c1', surveyId: 'survey-1' },
      { context: {} },
    )
  })

  it('still deletes the row when the element is not found', async () => {
    const ctx = buildContext(null)

    await handleContentDelete(patch, ctx)

    expect(removeEntityFields).not.toHaveBeenCalled()
    expect(deleteOne).toHaveBeenCalled()
  })
})
