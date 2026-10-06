import { Readable } from 'stream'

import {
  PROJECT_SETTINGS_VERSION,
  ProjectSettingsImportValidator,
  ProjectSettingsRawImport,
} from 'veysur-common'

import { AclContext } from 'model/entity/AclContext'

import {
  EntityHandlerInterface,
  EntityExportContext,
  ExportOptions,
  FormatFileEntry,
  ImportValidationResult,
  PersistImportContext,
} from '../EntityHandlerInterface'
import { FormatHandlerInterface } from '../format/FormatHandlerInterface'
import { ProjectExportCollector } from './ProjectEntityHandler/ProjectExportCollector'
import { VspsImportParser } from './ProjectEntityHandler/VspsImportParser'
import { VspsImportPersister } from './ProjectEntityHandler/VspsImportPersister'
import {
  PROJECT_IMPORT_PARTS,
  ProjectEntityHandlerDeps,
  ProjectExportBundle,
  ProjectImportPart,
  ProjectImportPlan,
  ProjectParsedBundle,
} from './ProjectEntityHandler/types'

type ProjectValidateOptions = {
  force?: boolean
  projectId: string
  aclContext: AclContext
  // import options pass through from generateImportUrl at runtime
  apply?: unknown
}

/**
 * Project-wide settings (.vsps): timezone, survey setting defaults and
 * project email templates. entityId is the project id.
 *
 * Import applies only the parts named in options.apply (all, by default).
 * Settings are replaced as a whole; templates overwrite matching type and
 * language and leave the others alone.
 */
export class ProjectEntityHandler implements EntityHandlerInterface {
  entityType = 'project'

  private collector: ProjectExportCollector
  private parser = new VspsImportParser()
  private persister: VspsImportPersister

  constructor(private readonly deps: ProjectEntityHandlerDeps) {
    this.collector = new ProjectExportCollector(deps)
    this.persister = new VspsImportPersister(deps)
  }

  async fetchForExport(
    projectId: string,
    context: EntityExportContext,
  ): Promise<ProjectExportBundle> {
    return this.collector.collect(projectId, context)
  }

  async prepareExportData(
    data: unknown,
    formatHandler: FormatHandlerInterface,
    _options?: ExportOptions,
  ): Promise<Readable> {
    const { timezone, settings, templates } = data as ProjectExportBundle

    const files: FormatFileEntry[] = [
      {
        filename: 'project.json',
        content: JSON.stringify(
          { version: PROJECT_SETTINGS_VERSION, timezone },
          null,
          2,
        ),
      },
      {
        filename: 'settings/survey.json',
        content: JSON.stringify(settings, null, 2),
      },
      ...templates.map((template) => ({
        filename: `templates/${template.type}-${template.lang}.json`,
        content: JSON.stringify(template, null, 2),
      })),
    ]

    return formatHandler.serialize(files)
  }

  async parseImportData(
    input: Readable,
    formatHandler: FormatHandlerInterface,
    context?: { importFileId?: string },
  ): Promise<ProjectParsedBundle> {
    return this.parser.parse(input, formatHandler, context)
  }

  async validateImport(
    data: unknown,
    options: ProjectValidateOptions,
  ): Promise<ImportValidationResult<ProjectImportPlan>> {
    const bundle = data as ProjectParsedBundle
    const { projectId, aclContext } = options

    const requested = this.parseApply(options.apply)
    if (requested === null) {
      return {
        valid: false,
        errors: [
          {
            part: 'manifest',
            message: `options.apply must be a list of: ${PROJECT_IMPORT_PARTS.join(', ')}`,
          },
        ],
      }
    }

    const isOwner = await this.isOwner(projectId, aclContext)
    const warnings: string[] = []
    const apply = new Set<ProjectImportPart>(requested ?? PROJECT_IMPORT_PARTS)
    if (apply.has('timezone') && !isOwner) {
      if (requested !== undefined) {
        return {
          valid: false,
          errors: [
            {
              part: 'timezone',
              message: 'Only the project owner can import the timezone',
            },
          ],
        }
      }
      apply.delete('timezone')
      warnings.push(
        'Timezone not imported: only the project owner can change it',
      )
    }

    const result = await new ProjectSettingsImportValidator(
      this.deps.getSettingsSchema(),
    ).validate(this.selectParts(bundle.raw, apply))

    return {
      valid: result.valid,
      errors: result.errors,
      warnings: [...warnings, ...result.warnings].map((message) => ({
        message,
      })),
      data: result.data,
    }
  }

  async persistImport(data: unknown, context: PersistImportContext) {
    return this.persister.persist(data as ProjectImportPlan, context)
  }

  getSupportedFormats(): string[] {
    return ['vsps']
  }

  getDefaultFormat(): string {
    return 'vsps'
  }

  /** undefined: no selection (everything); null: invalid selection. */
  private parseApply(apply: unknown): ProjectImportPart[] | undefined | null {
    if (apply === undefined) return undefined
    if (
      !Array.isArray(apply) ||
      !apply.every((part): part is ProjectImportPart =>
        (PROJECT_IMPORT_PARTS as readonly string[]).includes(part),
      )
    ) {
      return null
    }
    return apply
  }

  // The manifest is always validated; unselected parts are left out so a
  // problem in a part the user did not ask for cannot block the import.
  private selectParts(
    raw: ProjectSettingsRawImport,
    apply: Set<ProjectImportPart>,
  ): ProjectSettingsRawImport {
    const manifest =
      typeof raw.manifest === 'object' && raw.manifest !== null
        ? { ...(raw.manifest as Record<string, unknown>) }
        : raw.manifest
    if (!apply.has('timezone') && typeof manifest === 'object' && manifest) {
      delete (manifest as Record<string, unknown>).timezone
    }
    return {
      manifest,
      settings: apply.has('settings') ? raw.settings : null,
      templates: apply.has('templates') ? raw.templates : [],
    }
  }

  private async isOwner(
    projectId: string,
    aclContext: AclContext,
  ): Promise<boolean> {
    const project = await this.deps.getProjectService().getById(projectId)
    const userId = aclContext?.jwt?._id
    return Boolean(project && userId && project.ownerId === userId)
  }
}
