import { SchemaConstructor } from '@datacapy/schema'

import { CompletionStatus } from './SurveyParticipant/completionStatus'
import { SchemaSurveyParticipant } from '../schema/SchemaSurveyParticipant'

/** Fields come from {@link SchemaSurveyParticipant}. */
export class SurveyParticipant extends SchemaConstructor.from(
  SchemaSurveyParticipant,
) {
  get completionStatus(): CompletionStatus {
    if (!this.surveyResponse) {
      return 'notStarted'
    }

    return this.surveyResponse.completed ? 'completed' : 'inProgress'
  }
}
