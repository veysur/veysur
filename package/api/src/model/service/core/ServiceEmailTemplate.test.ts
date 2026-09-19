import { ServiceEmailTemplate } from './ServiceEmailTemplate'

describe('ServiceEmailTemplate', () => {
  let service: ServiceEmailTemplate
  let mockRepoEmailTemplate: { find: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceEmailTemplate()

    mockRepoEmailTemplate = { find: jest.fn().mockResolvedValue([]) }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        emailTemplate: mockRepoEmailTemplate,
      }
      return map[name]
    }) as typeof service.getRepo)
  })

  describe('getResolved', () => {
    it('wraps the resolved system template body in the shared layout', async () => {
      const resolved = await service.getResolved({
        projectId: 'proj_1',
        surveyId: 'survey_1',
        type: 'invite',
        lang: 'en',
      })

      expect(resolved).not.toBeNull()
      expect(resolved.body).toContain('<!DOCTYPE html>')
      expect(resolved.body).toContain('<style>')
      expect(resolved.body).toContain("You're invited to participate")
      expect(resolved.body).not.toContain('%%EMAIL_BODY%%')
    })
  })

  describe('getAll', () => {
    it('returns unwrapped fragment bodies for system templates', async () => {
      const result = await service.getAll({
        projectId: 'proj_1',
        surveyId: 'survey_1',
        includeDefaults: true,
      })
      const { systemTemplates } = result

      const invite = systemTemplates.find((t) => t.type === 'invite')
      expect(invite).toBeDefined()
      expect(invite.body).not.toContain('<!DOCTYPE html>')
      expect(invite.body).not.toContain('<style>')
      expect(invite.body).toContain("You're invited to participate")
    })
  })

  describe('getProjectAll', () => {
    // Regression test: this previously called `this.getRepo('project')` to resolve
    // a default language, which is `undefined` in self-hosted (no `project` repo
    // in that edition — see `_getProjectDefaultLang`). The mocked `getRepo` above
    // deliberately has no `project` key, so this fails the same way production did
    // if that dependency is ever reintroduced.
    it('resolves without a project repo and defaults the language to en', async () => {
      const result = await service.getProjectAll({ projectId: 'proj_1' })

      expect(result.projectDefaultLang).toBe('en')
      expect(result.projectTemplates).toEqual([])
    })
  })
})
