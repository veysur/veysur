import {
  Survey,
  SurveySection,
  SurveyQuestion,
  SurveyContent,
  SurveyElementBase,
  SurveyAnswerOption,
  L10n,
  isSurveyQuestion,
  isSurveyContent,
  isEqual,
  attributesMetadata,
  CONTENT_TYPE_YOUTUBE,
} from 'veysur-common'

/**
 * Fixed per-question-type attribute bullet order (survey-markdown-format.md
 * §3.4/§4: "attribute bullet order follows a fixed list per question type,
 * not the iteration order of the `attributes` object"). Matches §2.3's table
 * order (common `required` first, then type-specific attributes in the
 * table's own row order).
 */
const ATTRIBUTE_ORDER_BY_TYPE: Record<string, string[]> = {
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

/**
 * Exports a `Survey` model instance to the v1 markdown format
 * (survey-markdown-format.md). Pure function of the survey: same survey ->
 * byte-identical markdown, always (§4's determinism requirement) — no I/O,
 * no randomness, no `Date.now()`.
 */
export function exportSurveyToMarkdown(survey: Survey): string {
  const ordered = survey.applySortOrder()
  const defaultLang = ordered.language?.default || 'en'
  const languageOptions =
    ordered.language?.options && ordered.language.options.length > 0
      ? ordered.language.options
      : [defaultLang]

  const lines: string[] = []

  lines.push(...buildFrontMatter(defaultLang, languageOptions))
  lines.push('')
  lines.push(
    ...renderL10nField(ordered.title, defaultLang, languageOptions, (text) => [
      `# ${text}`,
    ]),
  )

  const welcomeSection = ordered.sections.welcome()
  const welcomeLines = buildWelcomeBlock(
    welcomeSection,
    defaultLang,
    languageOptions,
  )
  if (welcomeLines.length > 0) {
    lines.push('')
    lines.push(...welcomeLines)
  }

  for (const section of ordered.sections.groups()) {
    lines.push('')
    lines.push(
      ...buildSectionBlock(section, ordered, defaultLang, languageOptions),
    )
  }

  const thankYouSection = ordered.sections.thankYou()
  const thankYouLines = buildThankYouBlock(
    thankYouSection,
    defaultLang,
    languageOptions,
  )
  if (thankYouLines.length > 0) {
    lines.push('')
    lines.push(...thankYouLines)
  }

  return lines.join('\n') + '\n'
}

function buildFrontMatter(
  defaultLang: string,
  languageOptions: string[],
): string[] {
  return [
    '---',
    'spec: v1',
    'language:',
    `  default: ${defaultLang}`,
    `  options: [${languageOptions.join(', ')}]`,
    '---',
  ]
}

function buildWelcomeBlock(
  welcomeSection: SurveySection | undefined,
  defaultLang: string,
  languageOptions: string[],
): string[] {
  if (!welcomeSection) return []
  const defaultValue = welcomeSection.desc?.[defaultLang]
  if (typeof defaultValue !== 'string' || defaultValue === '') return []
  return renderL10nField(
    welcomeSection.desc,
    defaultLang,
    languageOptions,
    (text) => [`> ${text}`],
  )
}

function buildThankYouBlock(
  thankYouSection: SurveySection | undefined,
  defaultLang: string,
  languageOptions: string[],
): string[] {
  if (!thankYouSection) return []

  const messageValue = thankYouSection.desc?.[defaultLang]
  const hasMessage = typeof messageValue === 'string' && messageValue !== ''

  const linkUrl = thankYouSection.config?.link?.url?.[defaultLang]
  const linkText = thankYouSection.config?.link?.text?.[defaultLang]
  const hasLink =
    typeof linkUrl === 'string' &&
    linkUrl !== '' &&
    typeof linkText === 'string' &&
    linkText !== ''

  if (!hasMessage && !hasLink) return []

  const lines: string[] = ['## Thank you']

  if (hasMessage) {
    lines.push('')
    lines.push(
      ...renderL10nField(
        thankYouSection.desc,
        defaultLang,
        languageOptions,
        (text) => [text],
      ),
    )
  }

  if (hasLink) {
    lines.push('')
    lines.push(`[${linkText}](${linkUrl})`)
  }

  return lines
}

function buildSectionBlock(
  section: SurveySection,
  survey: Survey,
  defaultLang: string,
  languageOptions: string[],
): string[] {
  const lines: string[] = []

  lines.push(
    ...renderL10nField(section.name, defaultLang, languageOptions, (text) => [
      `## ${text}`,
    ]),
  )

  if (section.desc !== null) {
    lines.push('')
    lines.push(
      ...renderL10nField(section.desc, defaultLang, languageOptions, (text) => [
        text,
      ]),
    )
  }

  const elements = survey.elements.getBySectionId(section._id)
  for (const element of elements) {
    lines.push('')
    lines.push(...buildElementBlock(element, defaultLang, languageOptions))
  }

  return lines
}

function buildElementBlock(
  element: SurveyElementBase,
  defaultLang: string,
  languageOptions: string[],
): string[] {
  if (isSurveyQuestion(element)) {
    return buildQuestionBlock(element, defaultLang, languageOptions)
  }
  if (isSurveyContent(element)) {
    return buildContentBlock(element, defaultLang, languageOptions)
  }
  return []
}

/**
 * Element heading + text is one paired construct (survey-markdown-format.md
 * §3.6): the heading is structural and always printed once; the
 * default-language text line is omitted entirely when empty (§3.5 Example
 * D), and each non-default-language override repeats heading + text
 * together (§3.5 Example C).
 */
function buildElementTextLines(
  code: string,
  type: string,
  text: L10n,
  defaultLang: string,
  languageOptions: string[],
): string[] {
  const heading = `### ${code} · ${type}`
  const lines: string[] = [heading]

  const defaultValue = text?.[defaultLang]
  if (typeof defaultValue === 'string' && defaultValue !== '') {
    lines.push(defaultValue)
  }

  for (const lang of languageOptions) {
    if (lang === defaultLang) continue
    if (!text || !Object.prototype.hasOwnProperty.call(text, lang)) continue
    lines.push(`::lang[${lang}]`)
    lines.push(heading)
    lines.push(String(text[lang]))
    lines.push('::end')
  }

  return lines
}

function buildQuestionBlock(
  question: SurveyQuestion,
  defaultLang: string,
  languageOptions: string[],
): string[] {
  const lines = buildElementTextLines(
    question.code,
    question.type,
    question.text,
    defaultLang,
    languageOptions,
  )

  if (question.detail !== null) {
    lines.push('')
    lines.push(
      ...renderL10nField(
        question.detail,
        defaultLang,
        languageOptions,
        (text) => [`*${text}*`],
      ),
    )
  }

  const attributeBullets = buildAttributeBullets(question)
  if (attributeBullets.length > 0) {
    lines.push('')
    lines.push(...attributeBullets)
  }

  if (question.type === 'checkbox' || question.type === 'dropdown') {
    lines.push('')
    lines.push('Options:')
    for (const option of question.answerOptions ?? []) {
      lines.push(...buildAnswerOptionLine(option, defaultLang, languageOptions))
    }
  }

  return lines
}

function buildAnswerOptionLine(
  option: SurveyAnswerOption,
  defaultLang: string,
  languageOptions: string[],
): string[] {
  return renderL10nField(option.label, defaultLang, languageOptions, (text) => [
    `- [ ] ${option.code} · ${text}`,
  ])
}

function buildAttributeBullets(question: SurveyQuestion): string[] {
  const order = ATTRIBUTE_ORDER_BY_TYPE[question.type] ?? []
  const lines: string[] = []

  for (const attributeId of order) {
    const meta = attributesMetadata.find((m) => m.id === attributeId)
    if (!meta) continue
    const value = question.attributes?.[attributeId]
    if (value === undefined) continue
    if (isDefaultAttributeValue(value, meta.initialValue)) continue
    lines.push(`- ${attributeId}: ${renderAttributeValue(value)}`)
  }

  return lines
}

/**
 * `AttributeMeta.initialValue` for boolean attributes is typed `boolean`,
 * but a freshly-constructed question's raw `attributes.required` default is
 * the number `1` (`questionAttributesDefault` in SurveyQuestion.ts) rather
 * than `true` — schema validation normally casts this to a real boolean by
 * persist time, but an in-memory-only Survey (e.g. before its first save)
 * may still carry the numeric form. Coerce to boolean before comparing so
 * both forms are treated as the default.
 */
function isDefaultAttributeValue(
  value: unknown,
  initialValue: unknown,
): boolean {
  if (typeof initialValue === 'boolean' && typeof value !== 'boolean') {
    return Boolean(value) === initialValue
  }
  return isEqual(value, initialValue)
}

function renderAttributeValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'min' in value && 'max' in value) {
    const { min, max } = value as { min: number; max: number }
    return `{ min: ${min}, max: ${max} }`
  }
  return String(value)
}

function buildContentBlock(
  content: SurveyContent,
  defaultLang: string,
  languageOptions: string[],
): string[] {
  const heading = `### ${content.code} · ${content.type}`
  const lines: string[] = [heading]

  if (content.type === CONTENT_TYPE_YOUTUBE) {
    const url = content.config?.youtube?.url ?? ''
    lines.push(`<${url}>`)

    const captionValue = content.text?.[defaultLang]
    if (typeof captionValue === 'string' && captionValue !== '') {
      lines.push('')
      lines.push(
        ...renderL10nField(
          content.text,
          defaultLang,
          languageOptions,
          (text) => [text],
        ),
      )
    }
    return lines
  }

  const textLines = buildElementTextLines(
    content.code,
    content.type,
    content.text,
    defaultLang,
    languageOptions,
  )
  // Heading already pushed above; drop the duplicate from buildElementTextLines.
  return [...lines, ...textLines.slice(1)]
}

/**
 * The one shared helper implementing survey-markdown-format.md §3.6 once:
 * emits the default-language value via `render()`, then for each
 * non-default `languageOptions` entry with a key *present* on `l10n`
 * (present, not just truthy — an explicit empty string must still emit an
 * `::lang[xx]` block), emits `::lang[xx]` + `render()` + `::end`.
 */
function renderL10nField(
  l10n: L10n | null | undefined,
  defaultLang: string,
  languageOptions: string[],
  render: (text: string) => string[],
): string[] {
  const lines: string[] = []
  const defaultValue = l10n?.[defaultLang]
  lines.push(...render(typeof defaultValue === 'string' ? defaultValue : ''))

  for (const lang of languageOptions) {
    if (lang === defaultLang) continue
    if (!l10n || !Object.prototype.hasOwnProperty.call(l10n, lang)) continue
    lines.push(`::lang[${lang}]`)
    lines.push(...render(String(l10n[lang])))
    lines.push('::end')
  }

  return lines
}
