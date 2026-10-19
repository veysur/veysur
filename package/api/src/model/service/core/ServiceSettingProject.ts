import { Service, ServerErrorBadRequest } from '@datacapy/server'
import { DataSourceContext } from '@datacapy/om'
import { BotProtectionSetting, SettingProject } from 'veysur-common'

import { RepoSettingProject } from 'model'
import { contextForProject } from 'common'
import {
  hasBotProtectionSecret,
  maskBotProtectionSecrets,
  mergeBotProtectionSecrets,
} from 'model/service/botProtection'

/** Project-wide provider keys (maps, bot protection), outside the survey settings. */
export class ServiceSettingProject extends Service {
  constructor() {
    super({
      name: 'settingProject',
    })
  }

  async getOne({ projectId }: { projectId: string }) {
    const settingProject = await this.getOrCreate(contextForProject(projectId))
    return this.toResponse(settingProject)
  }

  async updateMaps({
    projectId,
    maps,
  }: {
    projectId: string
    maps: SettingProject['maps']
  }) {
    const context = contextForProject(projectId)
    const stored = await this.getOrCreate(context)

    await this.getRepo<RepoSettingProject>('settingProject').updateOne(
      {},
      { $set: { maps: { ...stored.maps, ...maps }, updatedAt: new Date() } },
      { context },
    )

    return this.refreshAndRespond(projectId, context)
  }

  async updateBotProtection({
    projectId,
    botProtection,
  }: {
    projectId: string
    botProtection: BotProtectionSetting
  }) {
    const context = contextForProject(projectId)
    const stored = await this.getOrCreate(context)

    const merged = mergeBotProtectionSecrets(
      botProtection,
      stored.botProtection,
    )
    this.assertCanStoreSecrets(merged)

    await this.getRepo<RepoSettingProject>('settingProject').updateOne(
      {},
      { $set: { botProtection: merged, updatedAt: new Date() } },
      { context },
    )

    return this.refreshAndRespond(projectId, context)
  }

  /**
   * The document is created on first use: projects made before it existed have
   * none, and deleting it resets the keys.
   */
  private async getOrCreate(
    context: DataSourceContext,
  ): Promise<SettingProject> {
    const repo = this.getRepo<RepoSettingProject>('settingProject')
    const existing = await repo.findOne({}, { context })
    if (existing) return existing
    return repo.create({}, { context })
  }

  private async refreshAndRespond(
    projectId: string,
    context: DataSourceContext,
  ) {
    await this.modelManager.services.surveyEmbedArtefact.refreshProject({
      projectId,
    })
    return this.toResponse(await this.getOrCreate(context))
  }

  /** Provider secret keys are write-only. */
  private toResponse(settingProject: SettingProject) {
    return {
      ...settingProject,
      botProtection: maskBotProtectionSecrets(settingProject.botProtection),
    }
  }

  /** The secret keys are encrypted fields, which need an encryption key. */
  private assertCanStoreSecrets(botProtection: BotProtectionSetting) {
    if (hasBotProtectionSecret(botProtection) &&!this.modelManager.config.encryptionService) {
      throw new ServerErrorBadRequest({
        message:
          'Bot protection secret keys need an encryption key. Set API_ENCRYPTION_PUBLIC_KEY and API_ENCRYPTION_PRIVATE_KEY first.',
      })
    }
  }
}

export default ServiceSettingProject
