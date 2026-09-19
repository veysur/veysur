import { Service, ServerErrorNotFound } from 'mzen-server'
import { DEFAULT_PROJECT_ID, Project } from 'veysur-common'

import { RepoProject } from 'model/repo'

/**
 * Self-hosted is single-project by design — there is exactly one row, fixed
 * to DEFAULT_PROJECT_ID, persisted via `RepoProject` and cached in memory
 * here (`ensureLoaded()` is called once at startup, before the router is
 * mounted — see `init/01-model-initialised`). Caching keeps `isOwner()`
 * synchronous, since it's called from many places (`ServiceAuth`,
 * `ServiceUser`, `ServiceTwoFactor`, survey services, etc.) that assume a
 * cheap, synchronous check.
 *
 * `ownerId` is still seeded/kept in sync from config
 * (`API_PROJECT_NAME`/`API_PROJECT_TIMEZONE`/`API_PROJECT_OWNER_ID`, the
 * latter written by `deploy/scripts/admin-account-bootstrap.sh`) — `name`
 * and `timezone` are only ever set from config on first creation, and are
 * DB-authoritative (editable via `updateTimezone`) after that.
 *
 * The cloud edition overrides this service entirely via the commercial
 * package's composition, with a real multi-tenant implementation backed by
 * its own repo.
 */
export class ServiceProject extends Service {
  repos: {
    project: RepoProject
  }

  private cachedProject: Project | null = null

  constructor() {
    super({
      name: 'project',
    })
  }

  async ensureLoaded(): Promise<Project> {
    const configured = this.config.model.app.project
    let project = await this.repos.project.findOne({ _id: DEFAULT_PROJECT_ID })

    if (!project) {
      const now = new Date()
      await this.repos.project.insertOne({
        _id: DEFAULT_PROJECT_ID,
        name: configured.name,
        timezone: configured.timezone,
        ownerId: configured.ownerId,
        createdAt: now,
        updatedAt: now,
      })
      project = await this.repos.project.findOne({ _id: DEFAULT_PROJECT_ID })
    } else if (configured.ownerId && configured.ownerId !== project.ownerId) {
      await this.repos.project.updateOne(
        { _id: DEFAULT_PROJECT_ID },
        { $set: { ownerId: configured.ownerId, updatedAt: new Date() } },
      )
      project = await this.repos.project.findOne({ _id: DEFAULT_PROJECT_ID })
    }

    this.cachedProject = new Project(project)
    return this.cachedProject
  }

  async getById(projectId: string): Promise<Project | null> {
    if (projectId !== DEFAULT_PROJECT_ID) {
      return null
    }

    if (!this.cachedProject) {
      await this.ensureLoaded()
    }

    return this.cachedProject
  }

  async updateTimezone({
    projectId,
    timezone,
  }: {
    projectId: string
    timezone: string
  }): Promise<Project> {
    if (projectId !== DEFAULT_PROJECT_ID) {
      throw new ServerErrorNotFound({ userMessage: 'Project not found' })
    }

    const updatedAt = new Date()
    await this.repos.project.updateOne(
      { _id: DEFAULT_PROJECT_ID },
      { $set: { timezone, updatedAt } },
    )

    this.cachedProject = new Project({
      ...this.cachedProject,
      timezone,
      updatedAt,
    })

    return this.cachedProject
  }

  isOwner(userId: string): boolean {
    return userId === this.cachedProject?.ownerId
  }
}

export default ServiceProject
