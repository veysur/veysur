import { Service } from '@datacapy/server'
import {
  EncryptionReencryptor,
  EncryptionReencryptorReport,
} from '@datacapy/om'
import { contextForProject } from 'common'
import type { RepoProject, RepoTask } from '../repo'

export interface EncryptionRotationOptions {
  batchSize?: number
  dryRun?: boolean
  /** Resume cursor, written back to the Task by the previous tick. */
  afterId?: string
}

export interface EncryptionRotationResult extends EncryptionReencryptorReport {
  dryRun: boolean
}

const TASK_NAME = 'encryptionRotation'
const ACTION_USERS = 'reencryptUsers'
const ACTION_PROJECT_SETTINGS = 'reencryptProjectSettings'

/** Sums the counters of two reports; cursor fields come from `total`. */
const mergeReports = (
  total: EncryptionReencryptorReport,
  part: EncryptionReencryptorReport,
): EncryptionReencryptorReport => {
  const byKid = { ...total.byKid }
  for (const [kid, count] of Object.entries(part.byKid)) {
    byKid[kid] = (byKid[kid] ?? 0) + count
  }
  return {
    ...total,
    scanned: total.scanned + part.scanned,
    rewrapped: total.rewrapped + part.rewrapped,
    skipped: total.skipped + part.skipped,
    failed: total.failed + part.failed,
    byKid,
  }
}

/**
 * Moves stored field-encryption envelopes onto the active key, so a retired key
 * can be dropped. Run through a Task (seeded disabled) during a key rotation;
 * see docs/encryption.md.
 */
export class ServiceEncryptionRotation extends Service {
  constructor() {
    super({ name: TASK_NAME })
  }

  async reencryptUsers(
    options: EncryptionRotationOptions = {},
  ): Promise<EncryptionRotationResult> {
    const dryRun = options.dryRun ?? false
    const report = await new EncryptionReencryptor(
      this.getRepo('user'),
      this.requireEncryptionService(),
    ).run({
      batchSize: options.batchSize,
      dryRun,
      afterId: options.afterId,
    })

    if (!dryRun) {
      await this.saveCursor(ACTION_USERS, options, report)
    }

    return { ...report, dryRun }
  }

  /**
   * The same move for each project's `settingProject` (the bot-protection
   * secret keys). `batchSize` counts projects per tick and `afterId` is the
   * last project id covered.
   */
  async reencryptProjectSettings(
    options: EncryptionRotationOptions = {},
  ): Promise<EncryptionRotationResult> {
    const encryptionService = this.requireEncryptionService()
    const dryRun = options.dryRun ?? false
    const batchSize = options.batchSize ?? 20
    const projects = await this.getRepo<RepoProject>('project').find(
      options.afterId ? { _id: { $gt: options.afterId } } : {},
      { sort: { _id: 1 }, limit: batchSize },
    )

    let report: EncryptionReencryptorReport = {
      scanned: 0,
      rewrapped: 0,
      skipped: 0,
      failed: 0,
      byKid: {},
      lastId: options.afterId,
      done: projects.length < batchSize,
    }
    const reencryptor = new EncryptionReencryptor(
      this.getRepo('settingProject'),
      encryptionService,
    )
    for (const project of projects) {
      const part = await reencryptor.run({
        dryRun,
        context: contextForProject(project._id),
      })
      report = { ...mergeReports(report, part), lastId: project._id }
    }

    if (!dryRun) {
      await this.saveCursor(ACTION_PROJECT_SETTINGS, options, report)
    }

    return { ...report, dryRun }
  }

  private requireEncryptionService() {
    const encryptionService = this.modelManager.config.encryptionService
    if (!encryptionService) {
      throw new Error('Field encryption is not configured')
    }
    return encryptionService
  }

  /**
   * Continue from the last document next tick; once the whole collection has
   * been covered, start from the beginning again so the next rotation (or a
   * late straggler) is picked up.
   */
  private async saveCursor(
    action: string,
    options: EncryptionRotationOptions,
    report: EncryptionReencryptorReport,
  ): Promise<void> {
    const afterId = report.done ? null : report.lastId
    await this.getRepo<RepoTask>('task').updateOne(
      { task: TASK_NAME, action },
      {
        $set: {
          options: { batchSize: options.batchSize, dryRun: false, afterId },
        },
      },
    )
  }
}

export default ServiceEncryptionRotation
