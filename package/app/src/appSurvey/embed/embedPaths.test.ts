import { embedArtefactUrl, embedPointerUrl, parseEmbedPath } from './embedPaths'

describe('embedPaths', () => {
  test('parses /embed/<projectId>/<surveyId>', () => {
    expect(parseEmbedPath('/embed/p1/s1')).toEqual({
      projectId: 'p1',
      surveyId: 's1',
    })
    expect(parseEmbedPath('/embed/p1/s1/')).toEqual({
      projectId: 'p1',
      surveyId: 's1',
    })
  })

  test.each(['/embed', '/embed/p1', '/survey/p1/s1', '/embed/p1/s1/extra'])(
    'rejects %s',
    (path) => {
      expect(parseEmbedPath(path)).toBeNull()
    },
  )

  test('builds the same keys the API writes', () => {
    expect(embedPointerUrl('p1', 's1')).toBe(
      '/veysur-files/project-p1/survey/s1/embed/current.json',
    )
    expect(embedArtefactUrl('p1', 's1', 'snap', 'de')).toBe(
      '/veysur-files/project-p1/survey/s1/embed/snap/de.json',
    )
  })
})
