import { Readable } from 'stream'

import MzenId from 'mzen-id'
import {
  Survey,
  SurveySnapshot,
  SurveyParticipant,
  SurveyResponse,
  SurveyAnswerOption,
  L10n,
  CHOICE_OTHER_CODE,
  CHOICE_OTHER_VALUE_KEY,
  RANKING_ORDER_KEY,
} from 'veysur-common'

import {
  RepoSurveyResponse,
  RepoSurveyParticipant,
  RepoSurveySnapshot,
  RepoSurveyLanguageSnapshot,
} from 'model'
import { mergeSurveyLanguageSnapshots } from 'model/common'

import {
  EntityHandlerInterface,
  EntityExportContext,
  ExportOptions,
  ImportValidationResult,
  PersistImportContext,
} from '../EntityHandlerInterface'
import { FormatHandlerInterface } from '../format/FormatHandlerInterface'
import { buildResponseEnvelope } from './util/buildResponseEnvelope'
import { ESTIMATED_BYTES_PER_RESPONSE } from './util/asyncTransferSizeThreshold'
import { contextForProject } from 'common'

const FIXED_HEADERS = [
  'surveyId',
  'publicationId',
  'snapshotId',
  'responseId',
  'participantId',
  'nameFirst',
  'nameLast',
  'email',
  'ip',
  'referrerUrl',
]

const MULTIPLE_CHOICE_TYPES = new Set(['checkbox', 'imageSelect'])

const SINGLE_CHOICE_TYPES = new Set(['dropdown', 'button'])

const NUMERIC_TYPES = new Set(['starRating', 'point5', 'point10', 'number'])

const RANKING_TYPE = 'ranking'

const FILE_UPLOAD_TYPE = 'fileUpload'

/**
 * A column definition for a survey question / subquestion cell in the CSV.
 */
interface ColumnDef {
  key: string // CSV header key e.g. "Q001", "Q001.SQ001", "Q001.SQ001.A001"
  text: string // Row 2: human-readable question/subquestion text (or AO label for binary columns)
  questionCode: string
  questionType: string
  // Matrix cells
  answerOptionCode?: string // for Q001.SQ001.A001 columns
  subquestionCode?: string // for Q001.SQ001 and Q001.SQ001.A001
  subquestionType?: string
  isMatrixCheckboxSubquestion: boolean
  allAnswerOptionCodes?: string[] // all AO codes for checkbox subquestion columns
  // Answer option binary columns
  isAnswerOptionColumn: boolean // true for Q001.A001 / Q001.SQ001.A001 binary columns
  answerOptionBinaryCode?: string // the specific AO code this binary column represents
  // Other value column
  isOtherTextColumn: boolean // true for Q001.OTHER_VALUE columns
}

/**
 * Validated CSV import payload threaded from validateImport to persistImport.
 */
interface SurveyResponseImportValidatedData {
  validRows: string[][]
  headers: string[]
  emailIdx: number
  participantIdIdx: number
  nameFirstIdx: number
  nameLastIdx: number
  surveyId: string
  publicationId: string
  snapshotId: string
  projectId: string
  columnDefs: ColumnDef[]
  colDefByKey: Record<string, ColumnDef>
}

function getTextValue(l10n: L10n | null | undefined, lang: string): string {
  if (!l10n) return ''
  return l10n.getLang(lang, 'en') || ''
}

function buildAnswerOptionBinaryColumns(
  parentKey: string,
  answerOptions: SurveyAnswerOption[],
  lang: string,
  contextText: string,
  baseColDef: Partial<ColumnDef>,
): ColumnDef[] {
  return answerOptions.map((ao) => ({
    key: `${parentKey}.${ao.code}`,
    text: `${contextText} [${getTextValue(ao.label, lang)}]`,
    questionCode: baseColDef.questionCode!,
    questionType: baseColDef.questionType!,
    answerOptionCode: baseColDef.answerOptionCode,
    subquestionCode: baseColDef.subquestionCode,
    subquestionType: baseColDef.subquestionType,
    isMatrixCheckboxSubquestion:
      baseColDef.isMatrixCheckboxSubquestion ?? false,
    allAnswerOptionCodes: baseColDef.allAnswerOptionCodes,
    isAnswerOptionColumn: true,
    answerOptionBinaryCode: ao.code,
    isOtherTextColumn: false,
  }))
}

function buildColumnDefs(survey: Survey, lang: string): ColumnDef[] {
  const columns: ColumnDef[] = []
  // Order columns by section order first (survey.sectionIds), then by element
  // order within each section (survey.elementIds) - mirrors
  // SurveyElementCollection.sortBySectionIds, the ordering the survey editor
  // itself maintains when elements/sections are reordered.
  const groupOrder = new Map(
    survey.sectionIds.map((sectionId, index) => [sectionId, index]),
  )
  const questionOrder = new Map(
    survey.elementIds.map((elementId, index) => [elementId, index]),
  )
  const questions = survey.elements.questionList().sort((a, b) => {
    const aGroupOrder = groupOrder.get(a.sectionId) ?? Number.MAX_SAFE_INTEGER
    const bGroupOrder = groupOrder.get(b.sectionId) ?? Number.MAX_SAFE_INTEGER
    if (aGroupOrder !== bGroupOrder) return aGroupOrder - bGroupOrder

    const aQuestionOrder = questionOrder.get(a._id) ?? Number.MAX_SAFE_INTEGER
    const bQuestionOrder = questionOrder.get(b._id) ?? Number.MAX_SAFE_INTEGER
    return aQuestionOrder - bQuestionOrder
  })

  for (const question of questions) {
    const questionText = getTextValue(question.text, lang)
    const subquestions = question.subquestions
      ? Array.from(question.subquestions)
      : []
    const answerOptions = question.answerOptions
      ? Array.from(question.answerOptions)
      : []

    const isMatrix = [
      'matrixComposite',
      'matrixText',
      'matrixNumber',
      'matrixDate',
      'matrixTime',
      'matrixDateTime',
      'matrixCheckbox',
      'matrixYesNo',
    ].includes(question.type)

    if (isMatrix && subquestions.length > 0) {
      const allAoCodes = answerOptions.map((ao) => ao.code)

      for (const sq of subquestions) {
        const sqText = getTextValue(sq.text, lang)
        const cellText = `${questionText} / ${sqText}`
        const isCheckboxSq = sq.type === 'checkbox'

        if (isCheckboxSq) {
          // Matrix checkbox subquestion — one main column, value = "A001,A002"
          const parentKey = `${question.code}.${sq.code}`
          columns.push({
            key: parentKey,
            text: cellText,
            questionCode: question.code,
            questionType: question.type,
            subquestionCode: sq.code,
            subquestionType: sq.type,
            isMatrixCheckboxSubquestion: true,
            allAnswerOptionCodes: allAoCodes,
            isAnswerOptionColumn: false,
            isOtherTextColumn: false,
          })
          // Binary column per answer option: Q001.SQ001.A001
          for (const ao of answerOptions) {
            columns.push({
              key: `${question.code}.${sq.code}.${ao.code}`,
              text: `${cellText} [${getTextValue(ao.label, lang)}]`,
              questionCode: question.code,
              questionType: question.type,
              subquestionCode: sq.code,
              subquestionType: sq.type,
              isMatrixCheckboxSubquestion: true,
              allAnswerOptionCodes: allAoCodes,
              isAnswerOptionColumn: true,
              answerOptionBinaryCode: ao.code,
              isOtherTextColumn: false,
            })
          }
        } else {
          // Non-checkbox matrix — one column per (answerOption × subquestion) pair
          for (const ao of answerOptions) {
            const aoText = getTextValue(ao.label, lang)
            const parentKey = `${question.code}.${sq.code}.${ao.code}`
            columns.push({
              key: parentKey,
              text: `${cellText} [${aoText}]`,
              questionCode: question.code,
              questionType: question.type,
              answerOptionCode: ao.code,
              subquestionCode: sq.code,
              subquestionType: sq.type,
              isMatrixCheckboxSubquestion: false,
              isAnswerOptionColumn: false,
              isOtherTextColumn: false,
            })
            // Binary columns for subquestion answer options (future use — SQ types
            // currently don't have their own answer option collections)
          }
        }
      }
    } else if (subquestions.length > 0) {
      // Non-matrix questions with subquestions — one column per subquestion
      for (const sq of subquestions) {
        const sqText = getTextValue(sq.text, lang)
        const cellText = `${questionText} / ${sqText}`
        const parentKey = `${question.code}.${sq.code}`
        columns.push({
          key: parentKey,
          text: cellText,
          questionCode: question.code,
          questionType: question.type,
          subquestionCode: sq.code,
          subquestionType: sq.type,
          isMatrixCheckboxSubquestion: false,
          isAnswerOptionColumn: false,
          isOtherTextColumn: false,
        })
        // Binary column per answer option: Q001.SQ001.A001
        if (answerOptions.length > 0) {
          columns.push(
            ...buildAnswerOptionBinaryColumns(
              parentKey,
              answerOptions,
              lang,
              cellText,
              {
                questionCode: question.code,
                questionType: question.type,
                subquestionCode: sq.code,
                subquestionType: sq.type,
                isMatrixCheckboxSubquestion: false,
              },
            ),
          )
        }
      }
    } else {
      // Simple question — one main column
      columns.push({
        key: question.code,
        text: questionText,
        questionCode: question.code,
        questionType: question.type,
        isMatrixCheckboxSubquestion: false,
        isAnswerOptionColumn: false,
        isOtherTextColumn: false,
      })
      // Binary column per answer option: Q001.A001
      if (answerOptions.length > 0) {
        columns.push(
          ...buildAnswerOptionBinaryColumns(
            question.code,
            answerOptions,
            lang,
            questionText,
            {
              questionCode: question.code,
              questionType: question.type,
              isMatrixCheckboxSubquestion: false,
            },
          ),
        )
      }
      // Other option columns when choiceOther is enabled
      if (question.attributes?.choiceOther) {
        columns.push({
          key: `${question.code}.${CHOICE_OTHER_CODE}`,
          text: `${questionText} [Other]`,
          questionCode: question.code,
          questionType: question.type,
          isMatrixCheckboxSubquestion: false,
          isAnswerOptionColumn: true,
          answerOptionBinaryCode: CHOICE_OTHER_CODE,
          isOtherTextColumn: false,
        })
        columns.push({
          key: `${question.code}.${CHOICE_OTHER_VALUE_KEY}`,
          text: `${questionText} [Other (value)]`,
          questionCode: question.code,
          questionType: question.type,
          isMatrixCheckboxSubquestion: false,
          isAnswerOptionColumn: false,
          isOtherTextColumn: true,
        })
      }
    }
  }

  return columns
}

/**
 * Answer payloads are free-form JSON, shaped differently per question type
 * (scalars, nested option maps, ranking arrays, matrix cells) — genuinely
 * dynamic data read via `asRecord`/`asArray` narrowing helpers below rather
 * than a single static interface.
 */
type AnswerValue = unknown
type AnswerRecord = Record<string, AnswerValue>

function asRecord(value: AnswerValue): AnswerRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as AnswerRecord)
    : undefined
}

function serializeAnswerForColumn(
  colDef: ColumnDef,
  answers: AnswerRecord,
): string {
  const questionAnswer = answers[colDef.questionCode]
  if (questionAnswer === null || questionAnswer === undefined)
    return colDef.isAnswerOptionColumn || colDef.isOtherTextColumn ? '0' : ''

  if (colDef.isOtherTextColumn) {
    const otherValue = asRecord(questionAnswer)?.[CHOICE_OTHER_VALUE_KEY]
    return typeof otherValue === 'string' ? otherValue : ''
  }

  if (colDef.isAnswerOptionColumn) {
    const aoCode = colDef.answerOptionBinaryCode!
    const questionAnswerRecord = asRecord(questionAnswer)

    if (colDef.isMatrixCheckboxSubquestion) {
      // answers[q][sq][ao] === true
      const sqAnswer = asRecord(questionAnswerRecord?.[colDef.subquestionCode!])
      return sqAnswer?.[aoCode] === true ? '1' : '0'
    }

    if (colDef.subquestionCode && !colDef.answerOptionCode) {
      // Non-matrix subquestion binary: answers[q][sq] is { A001: true, ... }
      const subqAnswer = asRecord(
        questionAnswerRecord?.[colDef.subquestionCode],
      )
      return subqAnswer?.[aoCode] ? '1' : '0'
    }

    if (colDef.subquestionCode && colDef.answerOptionCode) {
      // Non-checkbox matrix SQ with sub-AOs (future)
      return '0'
    }

    // Simple question: answers[q] is { A001: true, A002: false, ... }
    return questionAnswerRecord?.[aoCode] ? '1' : '0'
  }

  if (colDef.isMatrixCheckboxSubquestion) {
    // Collect AO codes where answers[q][sq][ao] === true
    const questionAnswerRecord = asRecord(questionAnswer)
    const sqAnswerRecord = asRecord(
      questionAnswerRecord?.[colDef.subquestionCode!],
    )
    const checked = (colDef.allAnswerOptionCodes || []).filter(
      (ao) => sqAnswerRecord?.[ao] === true,
    )
    return checked.join(',')
  }

  if (colDef.subquestionCode && colDef.answerOptionCode) {
    // Matrix cell: answers[q][sq][ao]
    const questionAnswerRecord = asRecord(questionAnswer)
    const cellVal = asRecord(questionAnswerRecord?.[colDef.subquestionCode])?.[
      colDef.answerOptionCode
    ]
    if (cellVal === null || cellVal === undefined) return ''
    if (colDef.subquestionType === 'yesNo') return cellVal ? '1' : '0'
    return String(cellVal)
  }

  if (colDef.subquestionCode) {
    // Multi-Part part: answers[q][partCode] — flat, no answer-option axis
    const questionAnswerRecord = asRecord(questionAnswer)
    const partVal = questionAnswerRecord?.[colDef.subquestionCode]
    if (partVal === null || partVal === undefined) return ''
    if (colDef.subquestionType === 'yesNo') return partVal ? '1' : '0'
    return String(partVal)
  }

  // Simple question
  const val = questionAnswer
  const type = colDef.questionType

  if (type === RANKING_TYPE) {
    const order = asRecord(val)?.[RANKING_ORDER_KEY]
    return Array.isArray(order) ? order.join(',') : ''
  }

  if (type === FILE_UPLOAD_TYPE) {
    // CSV has no way to carry file bytes - export the referenced fileIds
    // only (comma-joined), never the file content. CSV import is a one-way
    // degradation: this column is read-only on export, and reimporting a
    // fileUpload column is skipped (see deserializeAnswerValue) rather than
    // attempting to attach a file from a bare id string.
    const fileIds = asRecord(val)?.fileIds
    return Array.isArray(fileIds) ? fileIds.join(',') : ''
  }

  if (MULTIPLE_CHOICE_TYPES.has(type)) {
    const valRecord = asRecord(val)
    if (valRecord) {
      return Object.keys(valRecord)
        .filter((k) => k !== CHOICE_OTHER_VALUE_KEY && valRecord[k])
        .join(',')
    }
    return String(val)
  }

  if (SINGLE_CHOICE_TYPES.has(type)) {
    const valRecord = asRecord(val)
    if (valRecord) {
      return (
        Object.keys(valRecord).filter(
          (k) => k !== CHOICE_OTHER_VALUE_KEY && valRecord[k],
        )[0] || ''
      )
    }
    return String(val)
  }

  if (type === 'yesNo') {
    return val === true || val === 1
      ? '1'
      : val === false || val === 0
        ? '0'
        : ''
  }

  return val !== null && val !== undefined ? String(val) : ''
}

function ensureRecord(obj: AnswerRecord, key: string): AnswerRecord {
  const existing = asRecord(obj[key])
  if (existing) return existing
  const created: AnswerRecord = {}
  obj[key] = created
  return created
}

function deserializeAnswerValue(
  value: string,
  colDef: ColumnDef,
  answersAcc: AnswerRecord,
): void {
  if (value === '' || value === null || value === undefined) return

  const q = colDef.questionCode

  if (colDef.isOtherTextColumn) {
    ensureRecord(answersAcc, q)[CHOICE_OTHER_VALUE_KEY] = value
    return
  }

  if (colDef.isAnswerOptionColumn) {
    const aoCode = colDef.answerOptionBinaryCode!
    const selected = value === '1'

    if (colDef.isMatrixCheckboxSubquestion) {
      const questionRecord = ensureRecord(answersAcc, q)
      const sqRecord = ensureRecord(questionRecord, colDef.subquestionCode!)
      // Only set if main column hasn't already populated this cell
      if (sqRecord[aoCode] === undefined) {
        sqRecord[aoCode] = selected
      }
      return
    }

    // Simple/subquestion choice: supplement main column if not already set
    const questionRecord = ensureRecord(answersAcc, q)
    if (questionRecord[aoCode] === undefined) {
      if (selected) questionRecord[aoCode] = true
    }
    return
  }

  if (colDef.isMatrixCheckboxSubquestion) {
    // "A001,A002" → set each ao code true/false for this subquestion
    const checkedSet = new Set(
      value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    const questionRecord = ensureRecord(answersAcc, q)
    const sqRecord = ensureRecord(questionRecord, colDef.subquestionCode!)
    for (const ao of colDef.allAnswerOptionCodes || []) {
      sqRecord[ao] = checkedSet.has(ao)
    }
    return
  }

  if (colDef.subquestionCode && colDef.answerOptionCode) {
    // Matrix cell value
    const questionRecord = ensureRecord(answersAcc, q)
    const sqType = colDef.subquestionType || 'text'
    ensureRecord(questionRecord, colDef.subquestionCode)[
      colDef.answerOptionCode
    ] = parsePrimitiveValue(value, sqType)
    return
  }

  if (colDef.subquestionCode) {
    // Multi-Part part value: answers[q][partCode] — flat, no answer-option axis
    const questionRecord = ensureRecord(answersAcc, q)
    const partType = colDef.subquestionType || 'text'
    questionRecord[colDef.subquestionCode] = parsePrimitiveValue(
      value,
      partType,
    )
    return
  }

  // Simple question
  const type = colDef.questionType

  if (type === FILE_UPLOAD_TYPE) {
    // CSV import cannot attach files - a fileUpload column is a read-only
    // export artefact (see serializeAnswerForColumn); silently skip it here
    // rather than writing a bogus `{fileIds}`-shaped value from a raw id
    // string, or the answer's stored fileIds. Only `.vssp`/`.vssa` import
    // restores actual files.
    return
  }

  if (type === RANKING_TYPE) {
    const codes = value
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
    if (codes.length > 0) {
      const questionRecord = ensureRecord(answersAcc, q)
      for (const code of codes) questionRecord[code] = true
      questionRecord[RANKING_ORDER_KEY] = codes
    }
    return
  }

  if (MULTIPLE_CHOICE_TYPES.has(type)) {
    const codes = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    answersAcc[q] = {}
    const questionRecord = answersAcc[q] as AnswerRecord
    for (const code of codes) questionRecord[code] = true
    return
  }

  if (SINGLE_CHOICE_TYPES.has(type)) {
    answersAcc[q] = { [value.trim()]: true }
    return
  }

  answersAcc[q] = parsePrimitiveValue(value, type)
}

function parsePrimitiveValue(value: string, type: string): AnswerValue {
  if (type === 'yesNo') return value === '1' || value.toLowerCase() === 'true'
  if (NUMERIC_TYPES.has(type)) {
    const n = Number(value)
    return isNaN(n) ? null : n
  }
  return value
}

export class SurveyResponseEntityHandler implements EntityHandlerInterface {
  entityType = 'surveyResponse'

  constructor(
    private repoSurveyResponse: RepoSurveyResponse,
    private repoSurveyParticipant: RepoSurveyParticipant,
    private repoSurveySnapshot: RepoSurveySnapshot,
    private repoSurveyLanguageSnapshot: RepoSurveyLanguageSnapshot,
  ) {}

  private buildResponseExportQuery(
    surveyId: string,
    options?: ExportOptions,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {
      surveyId,
    }
    if (options?.publicationId) query.publicationId = options.publicationId

    if (options?.merged === 'merged') {
      query['merge.fromSnapshotId'] = { $ne: null }
    } else if (options?.merged === 'notMerged') {
      query.$nor = [{ 'merge.fromSnapshotId': { $ne: null } }]
    }

    return query
  }

  async estimateExportSize(
    entityId: string,
    context: EntityExportContext,
    options?: ExportOptions,
  ): Promise<number> {
    const dsContext = contextForProject(context.projectId)
    const query = this.buildResponseExportQuery(entityId, options)
    const responseCount = await this.repoSurveyResponse.count(query, {
      context: dsContext,
    })
    return responseCount * ESTIMATED_BYTES_PER_RESPONSE
  }

  async fetchForExport(
    surveyId: string,
    context: EntityExportContext,
    options?: ExportOptions,
  ): Promise<unknown> {
    const dsContext = contextForProject(context.projectId)
    const query = this.buildResponseExportQuery(surveyId, options)

    const responses = await this.repoSurveyResponse.find(query, {
      context: dsContext,
      populate: { participant: true },
    })

    let snapshotData: SurveySnapshot | null = null
    const snapshotId = options?.snapshotId as string | undefined
    if (snapshotId) {
      snapshotData = await this.repoSurveySnapshot.findOne(
        { snapshotId },
        { context: dsContext },
      )
      if (snapshotData?.survey) {
        const defaultLang = snapshotData.survey.language?.default
        const survey = await mergeSurveyLanguageSnapshots(
          this.repoSurveyLanguageSnapshot,
          snapshotData.survey,
          snapshotId,
          [defaultLang].filter(Boolean),
          dsContext,
        )
        snapshotData = { ...snapshotData, survey }
      }
    }

    return {
      surveyId,
      publicationId: options?.publicationId ?? null,
      responses,
      snapshotData,
    }
  }

  async prepareExportData(
    data: unknown,
    formatHandler: FormatHandlerInterface,
    _options?: ExportOptions,
  ): Promise<Readable> {
    const { surveyId, publicationId, responses, snapshotData } = data as {
      surveyId: string
      publicationId: string | null
      responses: SurveyResponse[]
      snapshotData: SurveySnapshot | null
    }

    if (formatHandler.format === 'csv') {
      return this.buildCsvExport(responses, snapshotData, formatHandler)
    }

    return formatHandler.serialize(
      buildResponseEnvelope(surveyId, publicationId, responses),
    )
  }

  private buildCsvExport(
    responses: SurveyResponse[],
    snapshotData: SurveySnapshot | null,
    formatHandler: FormatHandlerInterface,
  ): Readable {
    const surveyInstance = snapshotData?.survey
      ? new Survey(snapshotData.survey)
      : null
    const lang = surveyInstance?.language?.default || 'en'
    const columnDefs = surveyInstance
      ? buildColumnDefs(surveyInstance, lang)
      : []

    // Row 1: headers (codes)
    const headerRow = [...FIXED_HEADERS, ...columnDefs.map((c) => c.key)]

    // Row 2: human-readable labels (question text or AO label for binary columns)
    const textRow = [
      ...FIXED_HEADERS.map(() => ''),
      ...columnDefs.map((c) => c.text),
    ]

    // Data rows (start at row 3 — no answer option mapping row)
    const dataRows = responses.map((response) => {
      const answers = (response.answers as AnswerRecord) || {}
      const participant = response.participant || ({} as SurveyParticipant)

      const fixedValues = [
        response.surveyId || '',
        response.publicationId || '',
        response.snapshotId || '',
        response._id || '',
        response.participantId || '',
        participant.nameFirst || '',
        participant.nameLast || '',
        participant.email || '',
        response.ip || '',
        response.referrerUrl || '',
      ]

      const answerValues = columnDefs.map((col) =>
        serializeAnswerForColumn(col, answers),
      )

      return [...fixedValues, ...answerValues]
    })

    const rows: string[][] = [headerRow, textRow, ...dataRows]
    return formatHandler.serialize(rows)
  }

  parseImportData(
    input: Readable,
    formatHandler: FormatHandlerInterface,
    context?: { importFileId?: string },
  ): Promise<unknown> {
    return formatHandler.parse(input, context)
  }

  async validateImport(
    parsedData: unknown,
    options: {
      force?: boolean
      projectId: string
      aclContext: PersistImportContext['aclContext']
      surveyId?: string
      publicationId?: string
      snapshotId?: string
    },
  ): Promise<ImportValidationResult<SurveyResponseImportValidatedData>> {
    const rows = parsedData as string[][]

    if (!rows || rows.length < 1) {
      return { valid: false, errors: [{ message: 'CSV file is empty' }] }
    }

    const headers = rows[0]
    const emailIdx = headers.indexOf('email')
    const participantIdIdx = headers.indexOf('participantId')

    if (emailIdx === -1) {
      return {
        valid: false,
        errors: [{ message: 'CSV must include an "email" column' }],
      }
    }

    // Verify required fixed columns
    for (const col of [
      'surveyId',
      'publicationId',
      'snapshotId',
      'responseId',
    ]) {
      if (!headers.includes(col)) {
        return {
          valid: false,
          errors: [{ message: `CSV is missing required column: "${col}"` }],
        }
      }
    }

    const { projectId, surveyId, publicationId, snapshotId } = options

    if (!surveyId || !publicationId || !snapshotId) {
      return {
        valid: false,
        errors: [
          {
            message:
              'surveyId, publicationId, and snapshotId are required import options',
          },
        ],
      }
    }

    const dsContext = contextForProject(projectId)

    // Fetch snapshot data for column definitions
    const snapshotDataRaw = await this.repoSurveySnapshot.findOne(
      { snapshotId },
      { context: dsContext },
    )

    const snapshotDataInst = snapshotDataRaw
      ? new SurveySnapshot(snapshotDataRaw)
      : null
    const surveyInstance = snapshotDataInst?.survey || null
    const lang = surveyInstance?.language?.default || 'en'
    const columnDefs = surveyInstance
      ? buildColumnDefs(surveyInstance, lang)
      : []

    // Build column def lookup by key
    const colDefByKey = new Map<string, ColumnDef>()
    for (const col of columnDefs) colDefByKey.set(col.key, col)

    // Fetch existing responses with populated participants to detect duplicates
    const existingResponses = await this.repoSurveyResponse.find(
      { surveyId, publicationId },
      { context: dsContext, populate: { participant: true } },
    )

    const existingEmails = new Set<string>()
    const existingParticipantIds = new Set<string>()
    for (const r of existingResponses) {
      if (r.participant?.email)
        existingEmails.add(r.participant.email.toLowerCase())
      if (r.participantId) existingParticipantIds.add(r.participantId)
    }

    // Data rows start at index 2 (skip header row and text/label row)
    const dataRows = rows.slice(2)
    const discards: { row: number; email: string; reason: string }[] = []
    const validRows: string[][] = []

    dataRows.forEach((row, i) => {
      const email = (row[emailIdx] || '').toLowerCase().trim()
      const participantId =
        participantIdIdx >= 0 ? (row[participantIdIdx] || '').trim() : ''

      const isDuplicate =
        (email && existingEmails.has(email)) ||
        (participantId && existingParticipantIds.has(participantId))

      if (isDuplicate) {
        discards.push({ row: i + 3, email, reason: 'duplicate' })
      } else {
        validRows.push(row)
      }
    })

    return {
      valid: true,
      data: {
        validRows,
        headers,
        emailIdx,
        participantIdIdx,
        nameFirstIdx: headers.indexOf('nameFirst'),
        nameLastIdx: headers.indexOf('nameLast'),
        surveyId,
        publicationId,
        snapshotId,
        projectId,
        columnDefs,
        colDefByKey: Object.fromEntries(colDefByKey.entries()),
      },
      discards,
    }
  }

  async persistImport(
    data: unknown,
    context: PersistImportContext,
  ): Promise<{ entityId: string }> {
    const {
      validRows,
      headers,
      emailIdx,
      participantIdIdx: _participantIdIdx,
      nameFirstIdx,
      nameLastIdx,
      surveyId,
      publicationId,
      snapshotId,
      projectId,
      colDefByKey,
    } = data as SurveyResponseImportValidatedData

    const dsContext = contextForProject(projectId)

    const createdById = context.aclContext?.jwt?._id || null
    const colDefMap = new Map<string, ColumnDef>(Object.entries(colDefByKey))
    const questionHeaders = headers.slice(FIXED_HEADERS.length)

    for (const row of validRows) {
      const email = emailIdx >= 0 ? (row[emailIdx] || '').trim() : ''
      const nameFirst = nameFirstIdx >= 0 ? row[nameFirstIdx] || '' : ''
      const nameLast = nameLastIdx >= 0 ? row[nameLastIdx] || '' : ''

      // Find or create participant
      let participantId: string | null = null
      if (email) {
        const existing = await this.repoSurveyParticipant.findOne(
          { surveyId, email: email.toLowerCase() },
          { context: dsContext },
        )

        if (existing) {
          participantId = existing._id
        } else {
          const newParticipant = new SurveyParticipant({
            surveyId,
            createdById,
            nameFirst,
            nameLast,
            email: email.toLowerCase(),
            emailStatus: 'pending',
          })
          await this.repoSurveyParticipant.create(newParticipant, {
            context: dsContext,
          })
          participantId = newParticipant._id
        }
      }

      // Build answers from question columns (main columns first, then binary columns supplement)
      const answers: AnswerRecord = {}
      for (let i = 0; i < questionHeaders.length; i++) {
        const colKey = questionHeaders[i]
        const colDef = colDefMap.get(colKey)
        if (!colDef) continue
        const cellValue = row[FIXED_HEADERS.length + i] || ''
        deserializeAnswerValue(cellValue, colDef, answers)
      }

      const response = new SurveyResponse({
        _id: MzenId(),
        surveyId,
        publicationId,
        snapshotId,
        participantId,
        answers,
        completedAt: new Date(),
      })

      await this.repoSurveyResponse.insertOne(response, { context: dsContext })
    }

    return { entityId: surveyId }
  }

  getSupportedFormats(): string[] {
    return ['json', 'csv']
  }

  getDefaultFormat(): string {
    return 'json'
  }
}
