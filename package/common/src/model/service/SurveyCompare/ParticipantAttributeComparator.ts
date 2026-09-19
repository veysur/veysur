import { SurveyParticipantAttributeDefinition } from '../../constructor/SurveyParticipantAttribute'
import {
  ParticipantAttributeDifference,
  ParticipantAttributeL10nDifference,
  ParticipantAttributeLanguageDoc,
} from './types'

export class ParticipantAttributeComparator {
  compare(
    attributesA: SurveyParticipantAttributeDefinition[],
    attributesB: SurveyParticipantAttributeDefinition[],
  ): ParticipantAttributeDifference[] {
    const diffs: ParticipantAttributeDifference[] = []
    const mapA = new Map(attributesA.map((a) => [a.name, a]))
    const mapB = new Map(attributesB.map((b) => [b.name, b]))

    for (const [name, oldData] of mapA) {
      if (!mapB.has(name)) {
        diffs.push({ type: 'removed', name, oldData })
      }
    }

    for (const [name, newData] of mapB) {
      const oldData = mapA.get(name)
      if (!oldData) {
        diffs.push({ type: 'added', name, newData })
      } else if (this.isModified(oldData, newData)) {
        diffs.push({ type: 'modified', name, oldData, newData })
      }
    }

    return diffs
  }

  compareLanguages(
    languagesA: ParticipantAttributeLanguageDoc[],
    languagesB: ParticipantAttributeLanguageDoc[],
  ): ParticipantAttributeL10nDifference[] {
    const diffs: ParticipantAttributeL10nDifference[] = []
    const mapA = new Map(languagesA.map((l) => [l.languageCode, l.data]))
    const mapB = new Map(languagesB.map((l) => [l.languageCode, l.data]))

    const allLanguages = new Set([...mapA.keys(), ...mapB.keys()])

    for (const language of allLanguages) {
      const dataA = mapA.get(language) ?? {}
      const dataB = mapB.get(language) ?? {}
      const allNames = new Set([...Object.keys(dataA), ...Object.keys(dataB)])

      for (const name of allNames) {
        const attrA = dataA[name]
        const attrB = dataB[name]

        for (const field of ['label', 'description'] as const) {
          const oldValue = attrA?.[field]
          const newValue = attrB?.[field]

          if (oldValue !== newValue) {
            const type = !oldValue
              ? 'added'
              : !newValue
                ? 'removed'
                : 'modified'
            diffs.push({ type, name, language, field, oldValue, newValue })
          }
        }
      }
    }

    return diffs
  }

  private isModified(
    a: SurveyParticipantAttributeDefinition,
    b: SurveyParticipantAttributeDefinition,
  ): boolean {
    return (
      a.required !== b.required ||
      a.internal !== b.internal ||
      a.example !== b.example
    )
  }
}
