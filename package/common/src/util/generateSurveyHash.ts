import crypto from 'crypto'
import { Survey } from '../model/constructor/Survey'
import { SurveyLanguage } from '../model/constructor/SurveyLanguage'
import { SettingSurvey } from '../model/constructor/SettingSurvey'
import { SurveyElementCollection } from '../model/constructor/Survey/SurveyElementCollection'
import { isSurveyContent } from '../model/constructor/Survey/SurveyContent'
import { isSurveyQuestion } from '../model/constructor/Survey/SurveyQuestion'
import { SurveySectionCollection } from '../model/constructor/Survey/SurveySectionCollection'

/**
 * Generate deterministic structural hash for a survey — excludes all L10n text.
 *
 * Hash is based on normalized survey content after publishPrep().
 * Language text is excluded: see generateSurveyLanguageHash for per-language hashes.
 *
 * @param survey - Survey to hash
 * @param settingSurvey - Project defaults for normalization
 * @returns SHA-256 hash (64 char hex string)
 */
export function generateSurveyStructuralHash(
  survey: Survey,
  settingSurvey: SettingSurvey,
): string {
  const normalized = survey.publishPrep(settingSurvey)
  const canonical = createStructuralCanonicalRepresentation(normalized)
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex')
}

/** @deprecated Use generateSurveyStructuralHash */
export const generateSurveyHash = generateSurveyStructuralHash

/**
 * Generate deterministic hash for a single SurveyLanguage record.
 *
 * @param surveyLanguage - Language record to hash
 * @returns SHA-256 hash (64 char hex string)
 */
export function generateSurveyLanguageHash(
  surveyLanguage: SurveyLanguage,
): string {
  const canonical = sortKeysDeep(surveyLanguage.data)
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonical), 'utf8')
    .digest('hex')
}

/**
 * Generate composite snapshot content hash from structural + language hashes.
 *
 * @param structuralHash - Hash of the survey structure (no L10n)
 * @param languageHashes - Hashes of each SurveyLanguage, sorted by languageCode by the caller
 * @returns SHA-256 hash (64 char hex string)
 */
export function generateSnapshotContentHash(
  structuralHash: string,
  languageHashes: string[],
  attributeStructureHash?: string,
  attributeLanguageHashes?: string[],
): string {
  const parts: string[] = [structuralHash, ...languageHashes]
  if (attributeStructureHash !== undefined) {
    parts.push(attributeStructureHash)
  }
  if (attributeLanguageHashes !== undefined) {
    parts.push(...attributeLanguageHashes)
  }
  const input = parts.join(':')
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

export function generateParticipantAttributeStructureHash(
  attributes: Array<{
    name: string
    required: boolean
    internal: boolean
    example: string | null
  }>,
): string {
  const canonical = sortKeysDeep(attributes)
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonical), 'utf8')
    .digest('hex')
}

export function generateParticipantAttributeLanguageHash(
  data: Record<string, { label?: string; description?: string }>,
): string {
  const canonical = sortKeysDeep(data)
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonical), 'utf8')
    .digest('hex')
}

function createStructuralCanonicalRepresentation(survey: Survey): string {
  const hashableContent = {
    // Survey structure (no L10n text fields)
    // reads the raw element / section stores (all `kind`s) — content elements
    // and welcome/thank-you sections are first-class in the structural hash.
    elements: stripL10nFromElements(survey.elements),
    sections: stripL10nFromSections(survey.sections),
    elementIds: survey.elementIds,
    sectionIds: survey.sectionIds,

    // Settings (after publishPrep normalization)
    language: survey.language,
    presentation: survey.presentation,
    participant: survey.participant,
    data: survey.data,
    access: survey.access,
    notify: survey.notify,
    dataPolicy: stripL10nFromNestedText(survey.dataPolicy),
    legalNotice: stripL10nFromNestedText(survey.legalNotice),
    schedule: survey.schedule,
  }

  return JSON.stringify(sortKeysDeep(hashableContent))
}

function stripL10nFromElements(elements: SurveyElementCollection): unknown[] {
  if (!elements) return elements
  return Array.from(elements).map((element) => {
    // Content elements are first-class in the structural hash: adding, removing,
    // retyping, reconditioning, reconfiguring or reordering one forces a new
    // publication, exactly like a question. Their L10n text (body / caption) is
    // excluded here and rides the language hash instead.
    if (isSurveyContent(element)) {
      const config = element.config
      return {
        _id: element._id,
        kind: 'content',
        type: element.type,
        code: element.code,
        sectionId: element.sectionId,
        attributes: element.attributes,
        condition: element.condition,
        config: config?.youtube
          ? {
              youtube: {
                videoId: config.youtube.videoId ?? null,
                startAt: config.youtube.startAt ?? null,
              },
            }
          : null,
      }
    }
    if (!isSurveyQuestion(element)) {
      throw new Error(`Unexpected survey element kind: ${element.kind}`)
    }
    const q = element
    return {
      _id: q._id,
      type: q.type,
      code: q.code,
      sectionId: q.sectionId,
      attributes: q.attributes,
      condition: q.condition,
      subquestions: (q.subquestions ? Array.from(q.subquestions) : []).map(
        (sq) => ({
          _id: sq._id,
          type: sq.type,
          code: sq.code,
          attributes: sq.attributes,
        }),
      ),
      answerOptions: (q.answerOptions ? Array.from(q.answerOptions) : []).map(
        (ao) => ({
          _id: ao._id,
          code: ao.code,
        }),
      ),
    }
  })
}

function stripL10nFromSections(sections: SurveySectionCollection): unknown[] {
  if (!sections) return sections
  return Array.from(sections).map((g) => {
    const base: Record<string, unknown> = {
      _id: g._id,
      code: g.code,
      attributes: g.attributes,
      condition: g.condition,
    }
    // `kind` and `config.link` structure are emitted only when non-default, so
    // an existing group-only survey hashes byte-identically to before.
    const kind = g.kind
    if (kind && kind !== 'group') base.kind = kind
    const config = g.config
    if (config?.link) base.config = { link: { url: config.link.url ?? null } }
    return base
  })
}

function stripL10nFromNestedText(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  if (!obj) return obj
  const { text: _text, ...rest } = obj
  return rest
}

function sortKeysDeep(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(sortKeysDeep)
  if (typeof obj !== 'object') return obj
  return Object.keys(obj)
    .sort()
    .reduce(
      (sorted, key) => {
        sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key])
        return sorted
      },
      {} as Record<string, unknown>,
    )
}
