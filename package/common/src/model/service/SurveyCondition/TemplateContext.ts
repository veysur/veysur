import { ParticipantData } from '../SurveyExpression/types'
import {
  mergeParticipantData,
  ParticipantProfileForMerge,
} from './mergeParticipantData'

/**
 * The shared context object every `{{...}}` template placeholder and
 * dotted-path notify-recipient reference resolves against. `answers` is the
 * question-code-keyed answers container, matching `ConditionContext.answers`.
 * Unlike `ConditionContext`, there is currently no response-metadata
 * (`response.*`) container here - no template placeholder addresses response
 * metadata today, so nothing is lost by this context having only two
 * containers instead of three. `projectOwner`/`survey`/`project` are
 * populated only where meaningful for a given call site (e.g. `survey.link`
 * only for invite/reminder emails) - a container absent from the context
 * simply resolves every token under it to nothing.
 */
export interface TemplateContext {
  participant: ParticipantData
  answers: Record<string, unknown>
  projectOwner?: { email: string }
  survey?: { name: string; link?: string }
  project?: { name: string }
}

export interface TemplateContextInput {
  participant?: ParticipantProfileForMerge | null
  answers?: Record<string, unknown>
  projectOwnerEmail?: string | null
  survey?: { name: string; link?: string }
  project?: { name: string }
}

/**
 * Builds a `TemplateContext` from the raw data each call site already has on
 * hand (participant profile, completed-response answers, project owner
 * email, survey/project display fields). Replaces the ad hoc
 * `templateData`/`NotifyResolutionContext` object literals previously
 * duplicated across `ServiceSurveyCompletionEmail`, `ServiceSurveyParticipantInvite`,
 * and `ServiceAuthParticipant`.
 */
export function buildTemplateContext(
  input: TemplateContextInput,
): TemplateContext {
  return {
    participant: mergeParticipantData(input.participant),
    answers: input.answers ?? {},
    ...(input.projectOwnerEmail
      ? { projectOwner: { email: input.projectOwnerEmail } }
      : {}),
    ...(input.survey ? { survey: input.survey } : {}),
    ...(input.project ? { project: input.project } : {}),
  }
}
