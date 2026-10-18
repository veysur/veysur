// cspell:ignore jdoc
import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager, DataSourceContext } from '@datacapy/om'

/**
 * Move the project's maps key and bot-protection settings out of `settingSurvey`
 * into the `settingProject` document, encrypting any plaintext secret key on the
 * way. Runs once per project database.
 *
 * Idempotent: a project that already has a `settingProject` row keeps it, a value
 * that is already an encryption envelope is left alone, and a `settingSurvey` row
 * without the keys is skipped. With no encryption key configured the move still
 * happens, so no key is lost, and the secrets stay plaintext (with a warning)
 * until the rotation task rewraps them.
 */

type Exec = (sql: string, values?: unknown[]) => Promise<unknown>

interface Keys {
  secretKey?: unknown
}
interface SettingRow {
  id: string
  jdoc: {
    _id: string
    createdAt?: unknown
    updatedAt?: unknown
    maps?: unknown
    botProtection?: Record<string, Keys | undefined>
  }
}

const PROVIDERS = ['cloudflare', 'google'] as const

export default class MoveProjectKeysToSettingProject implements DatabasePatchInterface {
  version = '2026-10-18_1100'
  description =
    'Move project maps and bot-protection settings to settingProject'
  dataSourceName = 'project'

  async update(
    modelManager: ModelManager,
    context: DataSourceContext,
  ): Promise<void> {
    const repo = modelManager.getRepo('settingSurvey')
    if (!repo) throw new Error('settingSurvey repository not found')

    const ds = (await repo.getDataSource(context)) as unknown as {
      execute: Exec
      createTable(tableName: string): Promise<void>
    }
    const exec: Exec = (sql, values) => ds.execute(sql, values)

    let moved = 0
    let plaintext = 0
    try {
      if (!(await this.tableExists(exec, 'settingSurvey'))) return
      const [rows] = (await exec(
        'SELECT `gen__id` AS id, `jdoc` FROM `settingSurvey`',
      )) as [SettingRow[]]

      for (const row of rows) {
        const { maps, botProtection } = row.jdoc
        if (maps == null && botProtection == null) continue

        if (!(await this.tableExists(exec, 'settingProject'))) {
          await ds.createTable('settingProject')
        }
        if (!(await this.hasSettingProject(exec))) {
          plaintext += await this.encryptSecrets(modelManager, botProtection)
          await exec('INSERT INTO `settingProject` (`jdoc`) VALUES (?)', [
            JSON.stringify({
              _id: row.jdoc._id,
              ...(maps == null ? {} : { maps }),
              ...(botProtection == null ? {} : { botProtection }),
              createdAt: row.jdoc.createdAt,
              updatedAt: row.jdoc.updatedAt,
            }),
          ])
        }
        await exec(
          "UPDATE `settingSurvey` SET `jdoc` = JSON_REMOVE(`jdoc`, '$.maps', '$.botProtection') WHERE `gen__id` = ?",
          [row.id],
        )
        moved++
      }
    } finally {
      // Raw SQL bypasses the repo CRUD methods, which pair acquire/release
      // internally; release the ref getDataSource() took.
      repo.releaseDataSource(context)
    }

    if (plaintext > 0) {
      console.warn(
        `⚠ No encryption key configured, ${plaintext} bot-protection secret key(s) left as plaintext`,
      )
    }
    console.log(`✓ Moved ${moved} project settings document(s)`)
  }

  /** Encrypts in place; returns how many plaintext secrets it had to leave. */
  private async encryptSecrets(
    modelManager: ModelManager,
    botProtection: Record<string, Keys | undefined> | undefined,
  ): Promise<number> {
    const encryptionService = modelManager.config.encryptionService
    let left = 0
    for (const provider of PROVIDERS) {
      const keys = botProtection?.[provider]
      const value = keys?.secretKey
      if (!keys || typeof value !== 'string' || value === '') continue
      if (!encryptionService) {
        left++
        continue
      }
      // decrypt() returns a legacy plaintext value unchanged
      if ((await encryptionService.decrypt(value)) !== value) continue
      keys.secretKey = await encryptionService.encrypt(value)
    }
    return left
  }

  private async hasSettingProject(exec: Exec): Promise<boolean> {
    const [rows] = (await exec(
      'SELECT COUNT(*) AS count FROM `settingProject`',
    )) as [Array<{ count: number }>]
    return rows[0].count > 0
  }

  private async tableExists(exec: Exec, tableName: string): Promise<boolean> {
    const [rows] = (await exec(
      `SELECT COUNT(*) AS count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName],
    )) as [Array<{ count: number }>]
    return rows[0].count > 0
  }
}
