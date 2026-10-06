import { Patch } from 'veysur-common'

import { PersistImportContext } from '../../EntityHandlerInterface'
import {
  ProjectEntityHandlerDeps,
  ProjectImportPart,
  ProjectImportPartOutcome,
  ProjectImportPlan,
} from './types'

export class VspsImportPersister {
  constructor(private readonly deps: ProjectEntityHandlerDeps) {}

  /**
   * Parts are independent: one failing (for example a plan limit on the
   * settings) does not stop the others. Throws only when every attempted
   * part failed, so the caller sees the real error.
   */
  async persist(
    plan: ProjectImportPlan,
    context: PersistImportContext,
  ): Promise<{
    entityId: string
    details: ProjectImportPartOutcome[]
  }> {
    const { projectId, aclContext } = context
    const outcomes: ProjectImportPartOutcome[] = []
    const failures: unknown[] = []

    const attempt = async (
      part: ProjectImportPart,
      run: () => Promise<unknown>,
    ) => {
      try {
        await run()
        outcomes.push({ part, status: 'applied' })
      } catch (error) {
        failures.push(error)
        outcomes.push({
          part,
          status: 'failed',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (plan.timezone !== null) {
      await attempt('timezone', () =>
        this.deps.getProjectService().updateTimezone({
          projectId,
          timezone: plan.timezone,
          aclContext,
        }),
      )
    }

    if (plan.settings !== null) {
      const patches: Patch[] = [
        { type: 'settingSurvey', action: 'update', data: plan.settings },
      ]
      await attempt('settings', () =>
        this.deps.getSettingSurveyService().patch({ projectId, patches }),
      )
    }

    if (plan.templates.length > 0) {
      const patches: Patch[] = plan.templates.map((template) => ({
        type: 'emailTemplate',
        action: 'update',
        data: { ...template },
      }))
      await attempt('templates', () =>
        this.deps
          .getEmailTemplateService()
          .patchProject({ projectId, patches }),
      )
    }

    if (failures.length > 0 && failures.length === outcomes.length) {
      throw failures[0]
    }

    return { entityId: projectId, details: outcomes }
  }
}
