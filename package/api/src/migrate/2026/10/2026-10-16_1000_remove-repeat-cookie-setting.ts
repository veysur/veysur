// cspell:ignore jdoc
import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager, DataSourceContext } from '@datacapy/om'

/**
 * Remove the retired `access.repeatCookie` setting, replaced by
 * `access.preventRepeat`. Runs once per project database.
 *
 * The old key only ever held a value that was never enforced, so it is dropped
 * rather than carried over. Idempotent: rows without the key are untouched.
 * Published embed pointers are not rewritten; they ignore the key and the
 * scheduled embed repair task regenerates them.
 */

type Exec = (sql: string, values?: unknown[]) => Promise<unknown>

const TARGETS: Array<{ table: string; path: string }> = [
  { table: 'settingSurvey', path: '$.access.repeatCookie' },
  { table: 'survey', path: '$.access.repeatCookie' },
  { table: 'surveySnapshot', path: '$.survey.access.repeatCookie' },
  {
    table: 'surveySnapshotPartial',
    path: '$.surveyPartial.access.repeatCookie',
  },
]

export default class RemoveRepeatCookieSetting implements DatabasePatchInterface {
  version = '2026-10-16_1000'
  description = 'Remove the retired access.repeatCookie setting'
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

    const removed: Record<string, number> = {}
    try {
      for (const { table, path } of TARGETS) {
        if (!(await this.tableExists(exec, table))) continue
        removed[table] = await this.removeKey(exec, table, path)
      }
    } finally {
      // Raw SQL bypasses the repo CRUD methods, which pair acquire/release
      // internally; release the ref getDataSource() took.
      repo.releaseDataSource(context)
    }

    console.log(
      `✓ Removed access.repeatCookie — ${
        Object.entries(removed)
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

  private async removeKey(
    exec: Exec,
    table: string,
    path: string,
  ): Promise<number> {
    const [result] = (await exec(
      `UPDATE \`${table}\` SET \`jdoc\` = JSON_REMOVE(\`jdoc\`, ?)
       WHERE JSON_CONTAINS_PATH(\`jdoc\`, 'one', ?)`,
      [path, path],
    )) as [{ affectedRows: number }]
    return result.affectedRows
  }
}
