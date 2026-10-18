import { Service } from '@datacapy/server'
import {
  EncryptionReencryptor,
  EncryptionReencryptorReport,
} from '@datacapy/om'
import type { RepoTask } from '../repo'

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
const TASK_ACTION = 'reencryptUsers'

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
    const encryptionService = this.modelManager.config.encryptionService
    if (!encryptionService) {
      throw new Error('Field encryption is not configured')
    }

    const dryRun = options.dryRun ?? false
    const report = await new EncryptionReencryptor(
      this.getRepo('user'),
      encryptionService,
    ).run({
      batchSize: options.batchSize,
      dryRun,
      afterId: options.afterId,
    })

    if (!dryRun) await this.saveCursor(options, report)

    return { ...report, dryRun }
  }

  /**
   * Continue from the last document next tick; once the whole collection has
   * been covered, start from the beginning again so the next rotation (or a
   * late straggler) is picked up.
   */
  private async saveCursor(
    options: EncryptionRotationOptions,
    report: EncryptionReencryptorReport,
  ): Promise<void> {
    const afterId = report.done ? null : report.lastId
    await this.getRepo<RepoTask>('task').updateOne(
      { task: TASK_NAME, action: TASK_ACTION },
      {
        $set: {
          options: { batchSize: options.batchSize, dryRun: false, afterId },
        },
      },
    )
  }
}

export default ServiceEncryptionRotation
