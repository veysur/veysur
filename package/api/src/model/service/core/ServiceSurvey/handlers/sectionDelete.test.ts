import { Patch } from 'veysur-common'

import { handleSectionDelete } from './sectionDelete'
import { buildPatchContext } from 'test-utils/buildPatchContext'

describe('handleSectionDelete', () => {
  const buildContext = (elements: unknown[] = []) => {
    const find = jest.fn().mockResolvedValue(elements)
    const deleteMany = jest.fn().mockResolvedValue(undefined)
    const { ctx } = buildPatchContext({
      repos: {
        repoSurveyElement: { find, deleteMany },
        repoSurveySection: {
          deleteOne: jest.fn().mockResolvedValue(undefined),
        },
      },
    })
    return { ctx, find, deleteMany }
  }

  const patch: Patch = {
    type: 'section',
    action: 'delete',
    id: 'section-1',
    data: null,
  }

  it('queries and deletes the section elements by sectionId, not groupId', async () => {
    const { ctx, find, deleteMany } = buildContext([])

    await handleSectionDelete(patch, ctx)

    expect(find).toHaveBeenCalledWith(
      { sectionId: 'section-1', surveyId: 'survey-1' },
      expect.anything(),
    )
    expect(deleteMany).toHaveBeenCalledWith(
      { sectionId: 'section-1', surveyId: 'survey-1' },
      expect.anything(),
    )
  })
})
