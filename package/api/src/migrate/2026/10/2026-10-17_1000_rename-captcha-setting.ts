// cspell:ignore jdoc
import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager, DataSourceContext } from '@datacapy/om'

/**
 * Rename the survey access setting `access.captcha` to `access.botProtection`.
 * Runs once per project database.
 *
 * Idempotent: rows without the old key are untouched, and a row that already
 * has the new key keeps it while the old key is dropped. Published embed
 * pointers are not rewritten; the scheduled embed repair task regenerates them.
 */

type Exec = (sql: string, values?: unknown[]) => Promise<unknown>

const TARGETS: Array<{ table: string; base: string }> = [
  { table: 'settingSurvey', base: '$.access' },
  { table: 'survey', base: '$.access' },
  { table: 'surveySnapshot', base: '$.survey.access' },
  { table: 'surveySnapshotPartial', base: '$.surveyPartial.access' },
]

export default class RenameCaptchaSetting implements DatabasePatchInterface {
  version = '2026-10-17_1000'
  description = 'Rename the access.captcha setting to access.botProtection'
  dataSourceName = 'project'

  async update(
    modelManager: ModelManager,
    context: DataSourceContext,
  ): Promise<void> {
    const repo = modelManager.getRepo('survey')
    if (!repo) throw new Error('survey repository not found')

    const ds = (await repo.getDataSource(context)) as unknown as {
      execute: Exec
    }
    const exec: Exec = (sql, values) => ds.execute(sql, values)

    const renamed: Record<string, number> = {}
    try {
      for (const { table, base } of TARGETS) {
        if (!(await this.tableExists(exec, table))) continue
        renamed[table] = await this.renameKey(exec, table, base)
      }
    } finally {
      // Raw SQL bypasses the repo CRUD methods, which pair acquire/release
      // internally; release the ref getDataSource() took.
      repo.releaseDataSource(context)
    }

    console.log(
      `✓ Renamed access.captcha to access.botProtection — ${
        Object.entries(renamed)
          .map(([table, count]) => `${table}: ${count}`)
          .join(', ') || 'no tables found'
      }`,
    )
  }

  private async tableExists(exec: Exec, name: string): Promise<boolean> {
    const [rows] = (await exec(
      `SELECT COUNT(*) AS count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [name],
    )) as [Array<{ count: number }>]
    return rows[0].count > 0
  }

  private async renameKey(
    exec: Exec,
    table: string,
    base: string,
  ): Promise<number> {
    const oldPath = `${base}.captcha`
    const newPath = `${base}.botProtection`
    const [result] = (await exec(
      `UPDATE \`${table}\`
       SET \`jdoc\` = JSON_REMOVE(
         IF(JSON_CONTAINS_PATH(\`jdoc\`, 'one', ?),
            \`jdoc\`,
            JSON_SET(\`jdoc\`, ?, JSON_EXTRACT(\`jdoc\`, ?))),
         ?)
       WHERE JSON_CONTAINS_PATH(\`jdoc\`, 'one', ?)`,
      [newPath, newPath, oldPath, oldPath, oldPath],
    )) as [{ affectedRows: number }]
    return result.affectedRows
  }
}
