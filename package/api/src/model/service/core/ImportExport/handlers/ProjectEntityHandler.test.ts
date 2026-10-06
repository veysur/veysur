import { Readable } from 'stream'

import { PROJECT_SETTINGS_VERSION } from 'veysur-common'

import { AclConditions, AclContext } from 'model/entity/AclContext'

import { ArchiveReader } from '../format/ArchiveReader'
import { FormatHandlerInterface } from '../format/FormatHandlerInterface'
import { FormatFileEntry } from '../EntityHandlerInterface'
import { ProjectEntityHandler } from './ProjectEntityHandler'
import {
  EmailTemplateServiceLike,
  ProjectEntityHandlerDeps,
  ProjectImportPlan,
  ProjectParsedBundle,
  ProjectServiceLike,
  SettingSurveyServiceLike,
} from './ProjectEntityHandler/types'

const PROJECT_ID = 'project-1'
const OWNER_ID = 'owner-1'

const settingsDoc = {
  _id: 'settings-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  language: { default: 'de', options: ['de', 'en'] },
  access: { open: false },
  schedule: { start: '2030-01-01T00:00:00.000Z', end: null },
  stats: { questions: { Q1: { chartType: 'bar' } } },
}

const inviteTemplate = {
  type: 'invite',
  lang: 'en',
  subject: 'Hello',
  body: '<p>Hi</p>',
}

type Fakes = {
  project: jest.Mocked<ProjectServiceLike>
  settingSurvey: jest.Mocked<SettingSurveyServiceLike>
  emailTemplate: jest.Mocked<EmailTemplateServiceLike>
  deps: ProjectEntityHandlerDeps
}

function buildFakes(): Fakes {
  const project: jest.Mocked<ProjectServiceLike> = {
    getById: jest
      .fn()
      .mockResolvedValue({ timezone: 'Europe/London', ownerId: OWNER_ID }),
    updateTimezone: jest.fn().mockResolvedValue(undefined),
  }
  const settingSurvey: jest.Mocked<SettingSurveyServiceLike> = {
    getOne: jest.fn().mockResolvedValue(settingsDoc),
    patch: jest.fn().mockResolvedValue(true),
  }
  const emailTemplate: jest.Mocked<EmailTemplateServiceLike> = {
    getProjectAll: jest.fn().mockResolvedValue({
      projectTemplates: [
        inviteTemplate,
        { type: 'reminder', lang: 'en', subject: null, body: null },
        { type: 'team-invite', lang: 'en', subject: 's', body: 'b' },
      ],
    }),
    patchProject: jest.fn().mockResolvedValue(true),
  }
  return {
    project,
    settingSurvey,
    emailTemplate,
    deps: {
      getProjectService: () => project,
      getSettingSurveyService: () => settingSurvey,
      getEmailTemplateService: () => emailTemplate,
      getSettingsSchema: () => ({
        validate: async () => ({ isValid: true, errors: {} }),
      }),
    },
  }
}

const aclFor = (userId: string) => ({ jwt: { _id: userId } }) as AclContext

// Real tar+gzip streams stall under this package's global fake timers (the
// TarGzFormatHandler tests mock tar-stream for the same reason), so this
// stands in for the container: it carries the file list as JSON and loads it
// into an ArchiveReader the way TarGzFormatHandler.parse does.
class FakeFormatHandler implements FormatHandlerInterface {
  format = 'vsps'
  extensions = ['.vsps']

  serialize(data: unknown): Readable {
    return Readable.from([JSON.stringify(data)])
  }

  async parse(input: Readable): Promise<ArchiveReader> {
    const files = JSON.parse(
      (await readStream(input)).toString('utf8'),
    ) as FormatFileEntry[]
    const reader = new ArchiveReader({} as never, 'bucket')
    for (const file of files) {
      if (!('content' in file)) continue
      try {
        reader.setJson(file.filename, JSON.parse(file.content))
      } catch {
        reader.setMalformedJson(file.filename)
      }
    }
    return reader
  }

  getFilename(): string {
    return 'project.vsps'
  }

  getMimeType(): string {
    return 'application/octet-stream'
  }
}

async function readStream(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

describe('ProjectEntityHandler', () => {
  const formatHandler = new FakeFormatHandler()

  const parseFiles = (files: FormatFileEntry[]) =>
    new ProjectEntityHandlerFixture().handler.parseImportData(
      Readable.from([JSON.stringify(files)]),
      formatHandler,
    )

  class ProjectEntityHandlerFixture {
    fakes = buildFakes()
    handler = new ProjectEntityHandler(this.fakes.deps)
  }

  describe('export', () => {
    it('collects timezone, settings without excluded keys, and editable templates', async () => {
      const { handler } = new ProjectEntityHandlerFixture()
      const bundle = await handler.fetchForExport(PROJECT_ID, {
        projectId: PROJECT_ID,
        aclConditions: {} as AclConditions,
        aclContext: aclFor(OWNER_ID),
      })

      expect(bundle.timezone).toBe('Europe/London')
      expect(bundle.templates).toEqual([inviteTemplate])
      for (const key of [
        '_id',
        'createdAt',
        'updatedAt',
        'schedule',
        'stats',
      ]) {
        expect(bundle.settings).not.toHaveProperty(key)
      }
      expect(bundle.settings.language).toEqual({
        default: 'de',
        options: ['de', 'en'],
      })
    })

    it('rejects an entity id that is not the caller project', async () => {
      const { handler } = new ProjectEntityHandlerFixture()
      await expect(
        handler.fetchForExport('other', {
          projectId: PROJECT_ID,
          aclConditions: {} as AclConditions,
          aclContext: aclFor(OWNER_ID),
        }),
      ).rejects.toThrow('Project not found')
    })

    it('round-trips through the archive format', async () => {
      const { handler } = new ProjectEntityHandlerFixture()
      const bundle = await handler.fetchForExport(PROJECT_ID, {
        projectId: PROJECT_ID,
        aclConditions: {} as AclConditions,
        aclContext: aclFor(OWNER_ID),
      })
      const archive = await readStream(
        await handler.prepareExportData(bundle, formatHandler),
      )

      const parsed = await handler.parseImportData(
        Readable.from([archive]),
        formatHandler,
      )

      expect(parsed.raw.manifest).toEqual({
        version: PROJECT_SETTINGS_VERSION,
        timezone: 'Europe/London',
      })
      expect(parsed.raw.settings).toEqual(bundle.settings)
      expect(parsed.raw.templates).toEqual([inviteTemplate])
    })
  })

  describe('parse', () => {
    it('rejects an archive without project.json', async () => {
      await expect(
        parseFiles([{ filename: 'settings/survey.json', content: '{}' }]),
      ).rejects.toThrow('Missing required file in VSPS: project.json')
    })

    it('rejects an archive containing malformed JSON', async () => {
      await expect(
        parseFiles([
          { filename: 'project.json', content: '{"version":"1.0"}' },
          { filename: 'settings/survey.json', content: '{not json' },
        ]),
      ).rejects.toThrow('malformed JSON in settings/survey.json')
    })
  })

  describe('validateImport', () => {
    const bundle = (
      overrides: Partial<ProjectParsedBundle['raw']> = {},
    ): ProjectParsedBundle => ({
      raw: {
        manifest: { version: PROJECT_SETTINGS_VERSION, timezone: 'Asia/Tokyo' },
        settings: { language: { default: 'en', options: ['en'] } },
        templates: [inviteTemplate],
        ...overrides,
      },
      cleanup: async () => {},
    })

    const validate = (
      fixture: ProjectEntityHandlerFixture,
      data: ProjectParsedBundle,
      userId: string,
      apply?: unknown,
    ) =>
      fixture.handler.validateImport(data, {
        projectId: PROJECT_ID,
        aclContext: aclFor(userId),
        apply,
      })

    it('plans every part for the owner when nothing is selected', async () => {
      const result = await validate(
        new ProjectEntityHandlerFixture(),
        bundle(),
        OWNER_ID,
      )
      expect(result.valid).toBe(true)
      expect(result.data).toMatchObject({
        timezone: 'Asia/Tokyo',
        templates: [inviteTemplate],
      })
      expect(result.data?.settings).not.toBeNull()
    })

    it('skips the timezone with a warning for a non-owner by default', async () => {
      const result = await validate(
        new ProjectEntityHandlerFixture(),
        bundle(),
        'admin-2',
      )
      expect(result.valid).toBe(true)
      expect(result.data?.timezone).toBeNull()
      expect(JSON.stringify(result.warnings)).toContain(
        'only the project owner',
      )
    })

    it('rejects an explicit timezone request from a non-owner', async () => {
      const result = await validate(
        new ProjectEntityHandlerFixture(),
        bundle(),
        'admin-2',
        ['timezone'],
      )
      expect(result.valid).toBe(false)
    })

    it('applies only the selected parts', async () => {
      const result = await validate(
        new ProjectEntityHandlerFixture(),
        bundle(),
        OWNER_ID,
        ['templates'],
      )
      expect(result.data).toEqual({
        timezone: null,
        settings: null,
        templates: [inviteTemplate],
      })
    })

    it('does not let an unselected broken part block the import', async () => {
      const result = await validate(
        new ProjectEntityHandlerFixture(),
        bundle({
          manifest: {
            version: PROJECT_SETTINGS_VERSION,
            timezone: 'Mars/Base',
          },
          settings: 'broken',
        }),
        OWNER_ID,
        ['templates'],
      )
      expect(result.valid).toBe(true)
    })

    it('rejects an unknown part name', async () => {
      const result = await validate(
        new ProjectEntityHandlerFixture(),
        bundle(),
        OWNER_ID,
        ['everything'],
      )
      expect(result.valid).toBe(false)
    })
  })

  describe('persistImport', () => {
    const plan: ProjectImportPlan = {
      timezone: 'Asia/Tokyo',
      settings: { language: { default: 'en', options: ['en'] } },
      templates: [inviteTemplate],
    }
    const context = { projectId: PROJECT_ID, aclContext: aclFor(OWNER_ID) }

    it('applies each part through its service', async () => {
      const fixture = new ProjectEntityHandlerFixture()
      const result = await fixture.handler.persistImport(plan, context)

      expect(fixture.fakes.project.updateTimezone).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        timezone: 'Asia/Tokyo',
        aclContext: context.aclContext,
      })
      expect(fixture.fakes.settingSurvey.patch).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        patches: [
          { type: 'settingSurvey', action: 'update', data: plan.settings },
        ],
      })
      expect(fixture.fakes.emailTemplate.patchProject).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        patches: [
          { type: 'emailTemplate', action: 'update', data: inviteTemplate },
        ],
      })
      expect(result).toEqual({
        entityId: PROJECT_ID,
        details: [
          { part: 'timezone', status: 'applied' },
          { part: 'settings', status: 'applied' },
          { part: 'templates', status: 'applied' },
        ],
      })
    })

    it('keeps applying other parts when one fails', async () => {
      const fixture = new ProjectEntityHandlerFixture()
      fixture.fakes.settingSurvey.patch.mockRejectedValue(
        new Error('Plan limit exceeded'),
      )
      const result = await fixture.handler.persistImport(plan, context)

      expect(result.details).toEqual([
        { part: 'timezone', status: 'applied' },
        { part: 'settings', status: 'failed', message: 'Plan limit exceeded' },
        { part: 'templates', status: 'applied' },
      ])
    })

    it('throws the original error when every attempted part fails', async () => {
      const fixture = new ProjectEntityHandlerFixture()
      const failure = new Error('Plan limit exceeded')
      fixture.fakes.settingSurvey.patch.mockRejectedValue(failure)

      await expect(
        fixture.handler.persistImport(
          { timezone: null, settings: plan.settings, templates: [] },
          context,
        ),
      ).rejects.toBe(failure)
    })

    it('does nothing for parts that are absent', async () => {
      const fixture = new ProjectEntityHandlerFixture()
      await fixture.handler.persistImport(
        { timezone: null, settings: null, templates: [] },
        context,
      )
      expect(fixture.fakes.project.updateTimezone).not.toHaveBeenCalled()
      expect(fixture.fakes.settingSurvey.patch).not.toHaveBeenCalled()
      expect(fixture.fakes.emailTemplate.patchProject).not.toHaveBeenCalled()
    })
  })
})
