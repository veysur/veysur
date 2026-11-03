// cspell:ignore jdoc
import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager, DataSourceContext } from '@datacapy/om'

/**
 * Remove the vestigial `questionIds` from `surveySection` rows. Section
 * membership is each element's `sectionId` and order is the survey's
 * `elementIds`; the section-side list was never maintained. The 2026-09
 * reshape dropped it once, but the schema default kept writing an empty array
 * on insert until the field left the schema. Runs once per project database.
 *
 * Idempotent: rows without the key are untouched.
 */

type Exec = (sql: string, values?: unknown[]) => Promise<unknown>

export default class RemoveSectionQuestionIds implements DatabasePatchInterface {
  version = '2026-11-03_1000'
  description = 'Remove the vestigial questionIds from surveySection rows'
  dataSourceName = 'project'

  async update(
    modelManager: ModelManager,
    context: DataSourceContext,
  ): Promise<void> {
    const repo = modelManager.getRepo('surveySection')
    if (!repo) throw new Error('surveySection repository not found')

    const ds = (await repo.getDataSource(context)) as unknown as {
      execute: Exec
    }
    const exec: Exec = (sql, values) => ds.execute(sql, values)

    let removed = 0
    try {
      const [tables] = (await exec(
        `SELECT COUNT(*) AS count FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'surveySection'`,
      )) as [Array<{ count: number }>]
      if (tables[0].count > 0) {
        const [result] = (await exec(
          `UPDATE \`surveySection\` SET \`jdoc\` = JSON_REMOVE(\`jdoc\`, '$.questionIds')
           WHERE JSON_CONTAINS_PATH(\`jdoc\`, 'one', '$.questionIds')`,
        )) as [{ affectedRows: number }]
        removed = result.affectedRows
      }
    } finally {
      // Raw SQL bypasses the repo CRUD methods, which pair acquire/release
      // internally; release the ref getDataSource() took.
      repo.releaseDataSource(context)
    }

    console.log(`✓ Removed section questionIds from ${removed} rows`)
  }
}
