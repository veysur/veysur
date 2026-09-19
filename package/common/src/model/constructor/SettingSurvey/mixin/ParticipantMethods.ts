import { Constructor } from '../../../type'
import { SettingSurveyMixinBase } from './SettingSurveyMixinBase'

const defaultParticipant = {
  htmlEmail: true,
  thankYouEmail: true,
  tokenLength: 16,
}

export function ParticipantMethods<
  T extends Constructor<SettingSurveyMixinBase>,
>(Base: T) {
  return class extends Base {
    setParticipantProperty(key: string, value: unknown): this {
      return this.setNestedProperty(
        this.participant,
        defaultParticipant,
        'participant',
        key,
        value,
      )
    }

    updateParticipant(updates: Record<string, unknown>): this {
      return this.updateNestedProperty(
        this.participant,
        defaultParticipant,
        'participant',
        updates,
      )
    }
  }
}
