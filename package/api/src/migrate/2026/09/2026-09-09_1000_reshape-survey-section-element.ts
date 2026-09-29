// cspell:ignore jdoc
import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager, DataSourceContext } from '@datacapy/om'
import {
  migrateLegacySurveyJson,
  migrateLegacySurveyLanguageData,
} from 'veysur-common'

/**
 * Reshape stored survey data from the pre-`elements`-branch group/question model
 * to the canonical section/element model. Runs once per project database.
 *
 * The `elements` branch was a clean break with every read-time backward-compat
 * alias removed, so un-migrated rows load to empty `sections` /
 * `elements` collections. This patch is the migration that branch deferred.
 *
 * Steps (all idempotent, guarded on the presence of the old shape):
 *  1. `RENAME TABLE surveyQuestionGroup -> surveySection`,
 *     `surveyQuestion -> surveyElement`
 *  2. `surveyElement` rows: `groupId` -> `sectionId`, add `kind: 'question'`
 *  3. `surveySection` rows: add `kind: 'group'`, drop vestigial `questionIds`
 *  4. `survey` rows: rename id-order / content keys, fold `welcome` / `thankYou`
 *     into new `surveySection` rows (codes `WELCOME` / `THANKYOU`)
 *  5. `surveySnapshot.survey` / `surveySnapshotPartial.surveyPartial`: full
 *     embedded-survey transform in place
 *  6. `surveyLanguage.data` / `surveyLanguageSnapshot.data`: `groups` ->
 *     `sections`, `questions` -> `elements`, welcome/thank-you key renames
 *  7. create indexes on the renamed tables (supersedes the never-deployed
 *     2026-09-08_1000 index patch)
 *
 * `surveyPublication` and `surveyResponse` need no change — publications hold
 * only a `snapshotId`, and responses key `answers` by the (unchanged) question
 * and answer-option `code`.
 */

const JDOC = 'jdoc'
const PK = 'gen__id'

interface JdocRow {
  [PK]: string
  jdoc: Record<string, unknown>
}

type Exec = (sql: string, values?: unknown[]) => Promise<unknown>

const rowsOf = (result: unknown): JdocRow[] =>
  (Array.isArray(result) ? (result[0] as JdocRow[]) : []) ?? []

export default class ReshapeSurveySectionElement implements DatabasePatchInterface {
  version = '2026-09-09_1000'
  description =
    'Reshape survey data: group->section, question->element (tables, rows, snapshots, language)'
  dataSourceName = 'project'

  async update(
    modelManager: ModelManager,
    context: DataSourceContext,
  ): Promise<void> {
    const repoSurvey = modelManager.getRepo('survey')
    if (!repoSurvey) throw new Error('survey repository not found')

    const ds = (await repoSurvey.getDataSource(context)) as unknown as {
      execute: Exec
    }
    const exec: Exec = (sql, values) => ds.execute(sql, values)

    let elements: number
    let sections: number
    let surveys: number
    let foldedSections: number
    let snapshots: number
    let languages: number
    try {
      await this.renameTables(exec)
      elements = await this.transformElements(exec)
      sections = await this.transformSections(exec)
      ;({ surveys, foldedSections } = await this.transformSurveys(exec))
      snapshots = await this.transformSnapshots(exec)
      languages = await this.transformLanguages(exec)
    } finally {
      // getDataSource() above acquired a DataSourceRegistry ref for this project database -
      // release it here, since we bypassed the normal repo CRUD methods (which pair
      // getDataSource/releaseDataSource internally) to run raw SQL. Without this, the ref
      // leaks and the registry can never close this datasource on shutdown.
      repoSurvey.releaseDataSource(context)
    }

    for (const repoName of ['surveyElement', 'surveySection']) {
      try {
        await modelManager.getRepo(repoName).createIndexes(context)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes('already exists')) throw error
      }
    }

    console.log(
      `✓ Reshape complete — elements: ${elements}, sections: ${sections}, ` +
        `surveys: ${surveys} (+${foldedSections} welcome/thank-you sections), ` +
        `snapshot blobs: ${snapshots}, language blobs: ${languages}`,
    )
  }

  /**
   * Queries `information_schema` directly rather than the datasource's
   * `tableExists()` — that method has a positive-only cache which would go
   * stale the moment we `RENAME`, breaking a `--resume` / re-run.
   */
  private async tableExists(exec: Exec, name: string): Promise<boolean> {
    const [rows] = (await exec(
      `SELECT COUNT(*) AS count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [name],
    )) as [Array<{ count: number }>]
    return rows[0].count > 0
  }

  private async renameTables(exec: Exec): Promise<void> {
    const pairs: Array<[string, string]> = [
      ['surveyQuestionGroup', 'surveySection'],
      ['surveyQuestion', 'surveyElement'],
    ]
    for (const [oldName, newName] of pairs) {
      if (!(await this.tableExists(exec, oldName))) continue
      if (await this.tableExists(exec, newName)) {
        const [rows] = (await exec(
          `SELECT COUNT(*) AS count FROM \`${newName}\``,
        )) as [Array<{ count: number }>]
        if (rows[0].count > 0) {
          throw new Error(
            `Both \`${oldName}\` and a non-empty \`${newName}\` exist — resolve manually`,
          )
        }
        await exec(`DROP TABLE \`${newName}\``)
      }
      await exec(`RENAME TABLE \`${oldName}\` TO \`${newName}\``)
      console.log(`  renamed ${oldName} -> ${newName}`)
    }
  }

  private async writeJdoc(
    exec: Exec,
    table: string,
    id: string,
    jdoc: Record<string, unknown>,
  ): Promise<void> {
    await exec(`UPDATE \`${table}\` SET \`${JDOC}\` = ? WHERE \`${PK}\` = ?`, [
      JSON.stringify(jdoc),
      id,
    ])
  }

  private async transformElements(exec: Exec): Promise<number> {
    const rows = rowsOf(
      await exec(`SELECT \`${PK}\`, \`${JDOC}\` FROM \`surveyElement\``),
    )
    let changed = 0
    for (const { [PK]: id, jdoc } of rows) {
      let dirty = false
      if (jdoc.sectionId == null && jdoc.groupId != null) {
        jdoc.sectionId = jdoc.groupId
        dirty = true
      }
      if ('groupId' in jdoc) {
        delete jdoc.groupId
        dirty = true
      }
      if (jdoc.kind == null) {
        jdoc.kind = 'question'
        dirty = true
      }
      if (dirty) {
        await this.writeJdoc(exec, 'surveyElement', id, jdoc)
        changed++
      }
    }
    return changed
  }

  private async transformSections(exec: Exec): Promise<number> {
    const rows = rowsOf(
      await exec(`SELECT \`${PK}\`, \`${JDOC}\` FROM \`surveySection\``),
    )
    let changed = 0
    for (const { [PK]: id, jdoc } of rows) {
      let dirty = false
      if (jdoc.kind == null) {
        jdoc.kind = 'group'
        dirty = true
      }
      if ('questionIds' in jdoc) {
        delete jdoc.questionIds
        dirty = true
      }
      if (dirty) {
        await this.writeJdoc(exec, 'surveySection', id, jdoc)
        changed++
      }
    }
    return changed
  }

  private async transformSurveys(
    exec: Exec,
  ): Promise<{ surveys: number; foldedSections: number }> {
    const rows = rowsOf(
      await exec(`SELECT \`${PK}\`, \`${JDOC}\` FROM \`survey\``),
    )
    let surveys = 0
    let foldedSections = 0

    const legacyKeys = [
      'groups',
      'questions',
      'groupIds',
      'questionIds',
      'content',
      'welcome',
      'thankYou',
    ]

    for (const { [PK]: id, jdoc } of rows) {
      const needsWork = legacyKeys.some((key) => key in jdoc)
      if (!needsWork) continue

      const migrated = migrateLegacySurveyJson({ ...jdoc })
      const folded = Array.isArray(migrated.sections)
        ? (migrated.sections as Array<Record<string, unknown>>)
        : []
      delete migrated.sections
      delete migrated.elements

      for (const section of folded) {
        const sectionId = section._id as string
        const existing = rowsOf(
          await exec(
            `SELECT \`${PK}\` FROM \`surveySection\` WHERE \`${PK}\` = ?`,
            [sectionId],
          ),
        )
        if (existing.length === 0) {
          await exec(`INSERT INTO \`surveySection\` (\`${JDOC}\`) VALUES (?)`, [
            JSON.stringify(section),
          ])
          foldedSections++
        }
      }

      await this.writeJdoc(exec, 'survey', id, migrated)
      surveys++
    }
    return { surveys, foldedSections }
  }

  private async transformSnapshots(exec: Exec): Promise<number> {
    let changed = 0
    const targets: Array<[string, string]> = [
      ['surveySnapshot', 'survey'],
      ['surveySnapshotPartial', 'surveyPartial'],
    ]
    for (const [table, field] of targets) {
      const rows = rowsOf(
        await exec(`SELECT \`${PK}\`, \`${JDOC}\` FROM \`${table}\``),
      )
      for (const { [PK]: id, jdoc } of rows) {
        const embedded = jdoc[field]
        if (!embedded || typeof embedded !== 'object') continue
        const before = JSON.stringify(embedded)
        const migrated = migrateLegacySurveyJson({
          ...(embedded as Record<string, unknown>),
        })
        if (JSON.stringify(migrated) === before) continue
        jdoc[field] = migrated
        await this.writeJdoc(exec, table, id, jdoc)
        changed++
      }
    }
    return changed
  }

  private async transformLanguages(exec: Exec): Promise<number> {
    let changed = 0
    for (const table of ['surveyLanguage', 'surveyLanguageSnapshot']) {
      const rows = rowsOf(
        await exec(`SELECT \`${PK}\`, \`${JDOC}\` FROM \`${table}\``),
      )
      for (const { [PK]: id, jdoc } of rows) {
        const data = jdoc.data
        if (!data || typeof data !== 'object') continue
        const before = JSON.stringify(data)
        const migrated = migrateLegacySurveyLanguageData(
          data as Record<string, unknown>,
        )
        if (JSON.stringify(migrated) === before) continue
        jdoc.data = migrated
        await this.writeJdoc(exec, table, id, jdoc)
        changed++
      }
    }
    return changed
  }
}
