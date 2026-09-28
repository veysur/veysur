import { genUniqueId } from 'mzen-id'
import { ServerErrorBadRequest } from 'mzen-server'
import {
  CONTENT_TYPES,
  CONTENT_TYPE_YOUTUBE,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  getPointScaleCount,
  parseYoutubeUrl,
  CodeGenerator,
  SECTION_CODE_PREFIX,
  SECTION_CODE_WELCOME,
  SECTION_CODE_THANK_YOU,
} from 'veysur-common'

import {
  MarkdownParsedBundle,
  ImportSectionEntity,
  ImportElementEntity,
} from './types'

const THANK_YOU_HEADING = 'Thank you'

/**
 * Fixed per-question-type applicable attribute set — mirrors
 * MarkdownSurveyExporter's ATTRIBUTE_ORDER_BY_TYPE (§2.3). An attribute
 * bullet whose id is not in this set for the question's type is rejected
 * (§4: "attribute ID not in that question type's applicable set").
 */
const APPLICABLE_ATTRIBUTES_BY_TYPE: Record<string, string[]> = {
  text: ['required', 'inputSize', 'lengthMinMax'],
  number: ['required', 'numberMinMax', 'numberNegAllowed'],
  checkbox: ['required', 'choiceMinMax', 'choiceOther', 'choiceRandomise'],
  dropdown: ['required', 'choiceMinMax', 'choiceOther', 'choiceRandomise'],
  yesNo: ['required'],
  starRating: ['required'],
  point5: ['required'],
  point10: ['required'],
  date: ['required'],
  time: ['required'],
  dateTime: ['required'],
}

/** The 11 v1 question type strings (§1) — the keys of the map above. */
const VALID_QUESTION_TYPES = Object.keys(APPLICABLE_ATTRIBUTES_BY_TYPE)

function reject(lineNumber: number, message: string): never {
  throw new ServerErrorBadRequest({
    message: `Line ${lineNumber}: ${message}`,
  })
}

/** A small forward-only cursor over the document's body lines (after front matter). */
class LineCursor {
  private index = 0
  constructor(
    private lines: string[],
    private lineOffset: number,
  ) {}

  get lineNumber(): number {
    return this.index + this.lineOffset
  }

  peek(): string | undefined {
    return this.lines[this.index]
  }

  next(): string | undefined {
    return this.lines[this.index++]
  }

  atEnd(): boolean {
    return this.index >= this.lines.length
  }

  skipBlankLines(): void {
    while (!this.atEnd() && this.peek() === '') this.next()
  }

  /**
   * §3.4/§4: a `---` horizontal rule between blocks is insignificant
   * whitespace, exactly like a blank line — used at block-boundary points
   * (between elements, between sections) where the exporter may or may not
   * have emitted one.
   */
  skipBlankAndDividerLines(): void {
    while (!this.atEnd() && (this.peek() === '' || this.peek() === '---')) {
      this.next()
    }
  }
}

const HEADING_PATTERN = /^(#{1,3})\s+(.*)$/
const LANG_START_PATTERN = /^::lang\[([\w-]+)\]$/
const ATTRIBUTE_BULLET_PATTERN = /^- (\w+): (.*)$/
const OPTION_BULLET_PATTERN = /^- \[ \] (\S+) · (.*)$/
const POINT_LABEL_BULLET_PATTERN = /^- (\d+) · (.*)$/
const AUTOLINK_PATTERN = /^<(.*)>$/
const DETAIL_PATTERN = /^\*(.*)\*$/
const THANK_YOU_LINK_PATTERN = /^\[(.*)\]\((.*)\)$/

function isBoundaryLine(line: string | undefined): boolean {
  if (line === undefined || line === '') return true
  if (HEADING_PATTERN.test(line)) return true
  if (LANG_START_PATTERN.test(line)) return true
  if (line === '::end') return true
  if (line === '---') return true
  if (line === 'Options:') return true
  if (line === 'Labels:') return true
  if (POINT_LABEL_BULLET_PATTERN.test(line)) return true
  if (ATTRIBUTE_BULLET_PATTERN.test(line)) return true
  if (OPTION_BULLET_PATTERN.test(line)) return true
  if (DETAIL_PATTERN.test(line)) return true
  if (AUTOLINK_PATTERN.test(line)) return true
  return false
}

/** Reads consecutive non-boundary lines as one paragraph, joined by '\n'. */
function readParagraph(cursor: LineCursor): string {
  const parts: string[] = []
  while (!isBoundaryLine(cursor.peek())) {
    parts.push(cursor.next() as string)
  }
  return parts.join('\n')
}

function matchHeading(
  cursor: LineCursor,
  expectedLevel: number,
): { text: string } | null {
  const line = cursor.peek()
  if (line === undefined) return null
  const match = HEADING_PATTERN.exec(line)
  if (!match) return null
  if (match[1].length !== expectedLevel) return null
  cursor.next()
  return { text: match[2] }
}

function expectHeading(
  cursor: LineCursor,
  expectedLevel: number,
  what: string,
): { text: string } {
  const heading = matchHeading(cursor, expectedLevel)
  if (!heading) {
    reject(
      cursor.lineNumber,
      `Expected ${what} ('${'#'.repeat(expectedLevel)} ...')`,
    )
  }
  return heading
}

/** ::lang[xx]/::end wrapper shared by every L10n-bearing construct below. */
function readLangOverrides(
  cursor: LineCursor,
  defaultLang: string,
  languageOptions: string[],
  readOverrideValue: (lang: string) => string,
): Record<string, string> {
  const l10n: Record<string, string> = {}
  while (true) {
    const line = cursor.peek()
    if (line === undefined) break
    const match = LANG_START_PATTERN.exec(line)
    if (!match) break
    const lang = match[1]
    if (!languageOptions.includes(lang)) {
      reject(
        cursor.lineNumber,
        `Unknown language code '${lang}' in ::lang[${lang}]`,
      )
    }
    cursor.next()
    const value = readOverrideValue(lang)
    const endLine = cursor.next()
    if (endLine !== '::end') {
      reject(
        cursor.lineNumber,
        `Expected '::end' to close '::lang[${lang}]' block`,
      )
    }
    l10n[lang] = value
  }
  return l10n
}

/** A heading (H1/H2) whose text IS the L10n value (survey title / group name). */
function readHeadingL10n(
  cursor: LineCursor,
  level: number,
  defaultLang: string,
  languageOptions: string[],
  defaultText: string,
): Record<string, string> {
  const l10n: Record<string, string> = { [defaultLang]: defaultText }
  const overrides = readLangOverrides(
    cursor,
    defaultLang,
    languageOptions,
    () => {
      const heading = expectHeading(
        cursor,
        level,
        `repeated '${'#'.repeat(level)}' heading in ::lang block`,
      )
      return heading.text
    },
  )
  return { ...l10n, ...overrides }
}

/**
 * A plain paragraph field (group desc / detail / welcome blockquote /
 * contentVideoYoutube caption), no heading repeat in its ::lang overrides.
 * With no `singleLineMatcher`, reads a (possibly multi-line) paragraph up to
 * the next boundary. With one, the construct is exactly one line matching
 * that pattern (e.g. `*...*` for detail, `> ...` for the welcome blockquote)
 * — returns `null` (field absent) when the line doesn't match.
 */
function readPlainL10n(
  cursor: LineCursor,
  defaultLang: string,
  languageOptions: string[],
  singleLineMatcher?: (line: string) => string | null,
): Record<string, string> | null {
  cursor.skipBlankLines()
  const peeked = cursor.peek()
  if (peeked === undefined) return null

  let defaultValue: string
  if (singleLineMatcher) {
    const matched = singleLineMatcher(peeked)
    if (matched === null) return null
    cursor.next()
    defaultValue = matched
  } else {
    if (isBoundaryLine(peeked)) return null
    defaultValue = readParagraph(cursor)
  }

  const l10n: Record<string, string> = { [defaultLang]: defaultValue }
  const overrides = readLangOverrides(
    cursor,
    defaultLang,
    languageOptions,
    () => {
      if (singleLineMatcher) {
        const line = cursor.next()
        const matched = line !== undefined ? singleLineMatcher(line) : null
        if (matched === null) {
          reject(cursor.lineNumber, 'Malformed content in ::lang block')
        }
        return matched
      }
      return readParagraph(cursor)
    },
  )
  return { ...l10n, ...overrides }
}

const matchDetailLine = (line: string): string | null => {
  const match = DETAIL_PATTERN.exec(line)
  return match ? match[1] : null
}

const matchBlockquoteLine = (line: string): string | null => {
  const match = /^>\s?(.*)$/.exec(line)
  return match ? match[1] : null
}

/**
 * Element heading + text is one paired construct (§3.6): heading is always
 * printed once; the default-language text line is omitted when empty
 * (§3.5 Example D); each non-default-language override repeats
 * heading + text together (§3.5 Example C).
 */
function readElementHeadingText(
  cursor: LineCursor,
  expectedCode: string,
  expectedType: string,
  defaultLang: string,
  languageOptions: string[],
): Record<string, string> {
  const defaultValue = isBoundaryLine(cursor.peek())
    ? ''
    : readParagraph(cursor)
  const l10n: Record<string, string> = { [defaultLang]: defaultValue }
  const overrides = readLangOverrides(
    cursor,
    defaultLang,
    languageOptions,
    () => {
      const heading = expectHeading(
        cursor,
        3,
        'repeated element heading in ::lang block',
      )
      const headingMatch = /^(\S+) · (\S+)$/.exec(heading.text)
      if (
        !headingMatch ||
        headingMatch[1] !== expectedCode ||
        headingMatch[2] !== expectedType
      ) {
        reject(
          cursor.lineNumber,
          `::lang block heading must repeat '### ${expectedCode} · ${expectedType}'`,
        )
      }
      const line = cursor.next()
      return line ?? ''
    },
  )
  return { ...l10n, ...overrides }
}

function parseFrontMatter(text: string): {
  defaultLang: string
  languageOptions: string[]
  bodyLines: string[]
  bodyLineOffset: number
} {
  const lines = text.split('\n')
  if (lines[0] !== '---') {
    reject(1, "Missing required YAML front matter (must start with '---')")
  }
  const closeIndex = lines.indexOf('---', 1)
  if (closeIndex === -1) {
    reject(1, "Unterminated front matter block (missing closing '---')")
  }
  const frontMatterLines = lines.slice(1, closeIndex)

  const specLine = frontMatterLines.find((l) => l.startsWith('spec:'))
  if (!specLine) {
    reject(2, "Missing required 'spec:' front-matter key")
  }
  const specValue = specLine.slice('spec:'.length).trim()
  if (specValue !== 'v1') {
    reject(
      2,
      `Unsupported spec version '${specValue}': this importer only accepts 'spec: v1'`,
    )
  }

  const defaultLine = frontMatterLines.find((l) =>
    l.trim().startsWith('default:'),
  )
  const optionsLine = frontMatterLines.find((l) =>
    l.trim().startsWith('options:'),
  )
  if (!defaultLine || !optionsLine) {
    reject(
      2,
      "Missing required 'language.default' / 'language.options' front matter",
    )
  }
  const defaultLang = defaultLine.split('default:')[1].trim()
  const optionsMatch = /\[(.*)\]/.exec(optionsLine)
  if (!optionsMatch) {
    reject(2, "'language.options' must be a flow-style array, e.g. '[en, de]'")
  }
  const languageOptions = optionsMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!languageOptions.includes(defaultLang)) {
    reject(2, "'language.options' must include 'language.default'")
  }

  const bodyLines = lines.slice(closeIndex + 1)
  return {
    defaultLang,
    languageOptions,
    bodyLines,
    bodyLineOffset: closeIndex + 2,
  }
}

function parseAttributeValue(
  raw: string,
): boolean | number | string | { min: number; max: number } {
  if (raw === 'true') return true
  if (raw === 'false') return false
  const minMaxMatch = /^\{\s*min:\s*(-?\d+),\s*max:\s*(-?\d+)\s*\}$/.exec(raw)
  if (minMaxMatch) {
    return { min: Number(minMaxMatch[1]), max: Number(minMaxMatch[2]) }
  }
  if (/^-?\d+$/.test(raw)) return Number(raw)
  return raw
}

function parseAttributeBullets(
  cursor: LineCursor,
  questionType: string,
): Record<string, unknown> {
  const applicable = APPLICABLE_ATTRIBUTES_BY_TYPE[questionType] ?? []
  const attributes: Record<string, unknown> = {}

  while (true) {
    const line = cursor.peek()
    if (line === undefined) break
    const match = ATTRIBUTE_BULLET_PATTERN.exec(line)
    if (!match) break
    cursor.next()
    const [, attributeId, rawValue] = match
    if (attributeId === 'condition') {
      reject(
        cursor.lineNumber,
        "'condition:' is not supported in v1 (branching is deferred to a later spec version)",
      )
    }
    if (!applicable.includes(attributeId)) {
      reject(
        cursor.lineNumber,
        `Attribute '${attributeId}' is not applicable to question type '${questionType}'`,
      )
    }
    attributes[attributeId] = parseAttributeValue(rawValue)
  }

  return attributes
}

function parseOptions(
  cursor: LineCursor,
  defaultLang: string,
  languageOptions: string[],
  bulletPattern: RegExp = OPTION_BULLET_PATTERN,
  bulletExample: (code: string) => string = (code) => `- [ ] ${code} · ...`,
): Array<{ _id: string; code: string; label: Record<string, string> }> {
  const options: Array<{
    _id: string
    code: string
    label: Record<string, string>
  }> = []

  while (true) {
    const line = cursor.peek()
    if (line === undefined) break
    const match = bulletPattern.exec(line)
    if (!match) break
    cursor.next()
    const [, code, defaultLabel] = match
    const l10n: Record<string, string> = { [defaultLang]: defaultLabel }
    const overrides = readLangOverrides(
      cursor,
      defaultLang,
      languageOptions,
      () => {
        const optLine = cursor.next()
        const optMatch =
          optLine !== undefined ? bulletPattern.exec(optLine) : null
        if (!optMatch || optMatch[1] !== code) {
          reject(
            cursor.lineNumber,
            `::lang block option must repeat '${bulletExample(code)}'`,
          )
        }
        return optMatch[2]
      },
    )
    options.push({ _id: genUniqueId(), code, label: { ...l10n, ...overrides } })
  }

  return options
}

/**
 * Expands a `Labels:` block (`- <point> · <text>`) into the full P1..Pn
 * answer-option list a point-scale question stores, leaving unlabelled
 * points with an empty label.
 */
function parsePointLabels(
  cursor: LineCursor,
  count: number,
  defaultLang: string,
  languageOptions: string[],
): Array<{ _id: string; code: string; label: Record<string, string> }> {
  const startLine = cursor.lineNumber
  const entries = parseOptions(
    cursor,
    defaultLang,
    languageOptions,
    POINT_LABEL_BULLET_PATTERN,
    (code) => `- ${code} · ...`,
  )
  const byPoint = new Map<number, Record<string, string>>()
  for (const entry of entries) {
    const point = Number(entry.code)
    if (point < 1 || point > count) {
      reject(startLine, `Label point ${entry.code} is outside 1-${count}`)
    }
    if (byPoint.has(point)) {
      reject(startLine, `Label point ${entry.code} is listed more than once`)
    }
    byPoint.set(point, entry.label)
  }
  return Array.from({ length: count }, (_, i) => ({
    _id: genUniqueId(),
    code: `P${i + 1}`,
    label: byPoint.get(i + 1) ?? {},
  }))
}

function parseElementBlock(
  cursor: LineCursor,
  code: string,
  type: string,
  surveyId: string,
  sectionId: string,
  defaultLang: string,
  languageOptions: string[],
): ImportElementEntity {
  const isContent = (CONTENT_TYPES as readonly string[]).includes(type)
  const isQuestion = VALID_QUESTION_TYPES.includes(type)
  if (!isContent && !isQuestion) {
    reject(
      cursor.lineNumber,
      `Unsupported type '${type}' — v1 supports only ${[...VALID_QUESTION_TYPES, ...CONTENT_TYPES].join(', ')}`,
    )
  }

  const _id = genUniqueId()

  if (isContent) {
    if (type === CONTENT_TYPE_YOUTUBE) {
      const urlLine = cursor.next()
      const match =
        urlLine !== undefined ? AUTOLINK_PATTERN.exec(urlLine) : null
      if (!match) {
        reject(
          cursor.lineNumber,
          `'contentVideoYoutube' block '${code}' is missing its required <url> line`,
        )
      }
      const url = match[1]
      const parsed = parseYoutubeUrl(url)
      const text = readPlainL10n(cursor, defaultLang, languageOptions) ?? {
        [defaultLang]: '',
      }
      assertNoAttributeBullets(cursor, code)
      return {
        _id,
        kind: 'content',
        code,
        type,
        surveyId,
        sectionId,
        text,
        config: {
          youtube: {
            url,
            videoId: parsed?.videoId ?? null,
            startAt: parsed?.startAt ?? null,
          },
        },
      }
    }

    const text = readElementHeadingTextForContent(
      cursor,
      code,
      type,
      defaultLang,
      languageOptions,
    )
    assertNoAttributeBullets(cursor, code)
    return {
      _id,
      kind: 'content',
      code,
      type,
      surveyId,
      sectionId,
      text,
      config: null,
    }
  }

  const text = readElementHeadingText(
    cursor,
    code,
    type,
    defaultLang,
    languageOptions,
  )

  cursor.skipBlankLines()
  let detail: Record<string, string> | null = null
  if (DETAIL_PATTERN.test(cursor.peek() ?? '')) {
    detail = readPlainL10n(
      cursor,
      defaultLang,
      languageOptions,
      matchDetailLine,
    )
    cursor.skipBlankLines()
  }

  const attributes = parseAttributeBullets(cursor, type)

  let answerOptions: Array<{
    _id: string
    code: string
    label: Record<string, string>
  }> = []
  if (type === QUESTION_TYPE_CHECKBOX || type === QUESTION_TYPE_DROPDOWN) {
    cursor.skipBlankLines()
    if (cursor.peek() === 'Options:') {
      cursor.next()
      answerOptions = parseOptions(cursor, defaultLang, languageOptions)
    }
  } else if (getPointScaleCount(type) !== undefined) {
    cursor.skipBlankLines()
    if (cursor.peek() === 'Labels:') {
      cursor.next()
      answerOptions = parsePointLabels(
        cursor,
        getPointScaleCount(type),
        defaultLang,
        languageOptions,
      )
    }
  } else {
    cursor.skipBlankLines()
    if (cursor.peek() === 'Options:') {
      reject(
        cursor.lineNumber,
        `Question type '${type}' does not support an Options: block`,
      )
    }
  }

  return {
    _id,
    kind: 'question',
    code,
    type,
    surveyId,
    sectionId,
    text,
    detail,
    attributes,
    answerOptions,
  }
}

/** contentText's body is exactly like a question's text (§3.4a). */
function readElementHeadingTextForContent(
  cursor: LineCursor,
  code: string,
  type: string,
  defaultLang: string,
  languageOptions: string[],
): Record<string, string> {
  return readElementHeadingText(
    cursor,
    code,
    type,
    defaultLang,
    languageOptions,
  )
}

/** §4: an attribute bullet list under a content block is a direct reject. */
function assertNoAttributeBullets(cursor: LineCursor, code: string): void {
  cursor.skipBlankLines()
  const line = cursor.peek()
  if (line !== undefined && ATTRIBUTE_BULLET_PATTERN.test(line)) {
    reject(
      cursor.lineNumber,
      `Content block '${code}' has an attribute bullet list — content has no attributes in v1`,
    )
  }
}

function parseGroupSection(
  cursor: LineCursor,
  headingText: string,
  surveyId: string,
  defaultLang: string,
  languageOptions: string[],
): { section: ImportSectionEntity; elements: ImportElementEntity[] } {
  const sectionId = genUniqueId()
  const name = readHeadingL10n(
    cursor,
    2,
    defaultLang,
    languageOptions,
    headingText,
  )

  const desc = readPlainL10n(cursor, defaultLang, languageOptions)

  const elements: ImportElementEntity[] = []
  while (true) {
    cursor.skipBlankAndDividerLines()
    const heading = matchHeading(cursor, 3)
    if (!heading) break
    const headingMatch = /^(\S+) · (\S+)$/.exec(heading.text)
    if (!headingMatch) {
      reject(
        cursor.lineNumber,
        `Malformed element heading '${heading.text}' — expected '<code> · <type>'`,
      )
    }
    const [, code, type] = headingMatch
    const element = parseElementBlock(
      cursor,
      code,
      type,
      surveyId,
      sectionId,
      defaultLang,
      languageOptions,
    )
    elements.push(element)
  }

  const section: ImportSectionEntity = {
    _id: sectionId,
    kind: 'group',
    // §2.2/§4: the markdown grammar has no code slot for a group heading
    // ('## <Group Name>' carries no code) — the section code is always
    // auto-generated on import, assigned by the caller once all group
    // sections are known (mirrors SurveySectionCollection.getNextCode()'s
    // 'G00N' sequence, the same generator the live editor uses).
    code: undefined,
    surveyId,
    name,
    desc,
    config: null,
    elementIds: elements.map((e) => e._id),
  }

  return { section, elements }
}

function parseThankYouSection(
  cursor: LineCursor,
  surveyId: string,
  defaultLang: string,
  languageOptions: string[],
): ImportSectionEntity {
  const sectionId = genUniqueId()
  const desc = readPlainL10n(cursor, defaultLang, languageOptions)

  cursor.skipBlankLines()
  let link: {
    url: Record<string, string>
    text: Record<string, string>
  } | null = null
  const linkLine = cursor.peek()
  if (linkLine !== undefined) {
    const match = THANK_YOU_LINK_PATTERN.exec(linkLine)
    if (match) {
      cursor.next()
      link = {
        text: { [defaultLang]: match[1] },
        url: { [defaultLang]: match[2] },
      }
    }
  }

  return {
    _id: sectionId,
    kind: 'thankYou',
    code: SECTION_CODE_THANK_YOU,
    surveyId,
    name: { [defaultLang]: THANK_YOU_HEADING },
    desc,
    config: link ? { link } : null,
    elementIds: [],
  }
}

export function parseMarkdownSurvey(text: string): MarkdownParsedBundle {
  const { defaultLang, languageOptions, bodyLines, bodyLineOffset } =
    parseFrontMatter(text)
  const cursor = new LineCursor(bodyLines, bodyLineOffset)
  const surveyId = genUniqueId()

  cursor.skipBlankLines()
  const titleHeading = expectHeading(cursor, 1, 'survey title')
  const title = readHeadingL10n(
    cursor,
    1,
    defaultLang,
    languageOptions,
    titleHeading.text,
  )

  cursor.skipBlankLines()
  const welcomeMessage = readPlainL10n(
    cursor,
    defaultLang,
    languageOptions,
    matchBlockquoteLine,
  )
  let welcomeSectionId: string | null = null
  const sections: ImportSectionEntity[] = []
  const elements: ImportElementEntity[] = []

  if (welcomeMessage) {
    welcomeSectionId = genUniqueId()
    sections.push({
      _id: welcomeSectionId,
      kind: 'welcome',
      code: SECTION_CODE_WELCOME,
      surveyId,
      name: { [defaultLang]: 'Welcome' },
      desc: welcomeMessage,
      config: null,
      elementIds: [],
    })
  }

  const groupSectionIds: string[] = []
  const groupSectionCodes: string[] = []
  let thankYouSection: ImportSectionEntity | null = null

  while (true) {
    cursor.skipBlankAndDividerLines()
    if (cursor.atEnd()) break
    const heading = expectHeading(
      cursor,
      2,
      "a group heading ('## <name>') or 'Thank you'",
    )
    if (heading.text === THANK_YOU_HEADING) {
      thankYouSection = parseThankYouSection(
        cursor,
        surveyId,
        defaultLang,
        languageOptions,
      )
      continue
    }
    const { section, elements: sectionElements } = parseGroupSection(
      cursor,
      heading.text,
      surveyId,
      defaultLang,
      languageOptions,
    )
    section.code = CodeGenerator.getNextCode(
      SECTION_CODE_PREFIX,
      groupSectionCodes,
    )
    groupSectionCodes.push(section.code)
    sections.push(section)
    groupSectionIds.push(section._id)
    elements.push(...sectionElements)
  }

  if (thankYouSection) sections.push(thankYouSection)

  const sectionIds = [
    ...(welcomeSectionId ? [welcomeSectionId] : []),
    ...groupSectionIds,
    ...(thankYouSection ? [thankYouSection._id] : []),
  ]

  const survey = {
    _id: surveyId,
    // §2.1: `name` (a plain, non-localized admin-only label — distinct from
    // the public, localized `title`) has no grammar slot in v1, the same way
    // a group heading has no code slot (§2.2). Deriving it from the
    // default-language title mirrors ServiceSurvey.create()'s normal-creation
    // behaviour in reverse (there, `title` is seeded from the user-entered
    // `name`); the 'Untitled Survey' fallback only applies to the pathological
    // case of a genuinely empty title (§3.5 Example D).
    name: title[defaultLang]?.trim() || 'Untitled Survey',
    title,
    language: { default: defaultLang, options: languageOptions },
    sectionIds,
    elementIds: elements.map((e) => e._id),
  }

  return { sourceFormat: 'markdown', survey, sections, elements }
}
