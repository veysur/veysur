import {
  EmailTemplate,
  EmailTemplateCollection,
  PatchApplierEmailTemplate,
  Patch,
  PatchBuffer,
} from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import { useAuth } from 'appAdmin/hook'
import { usePatchableState } from 'hook'
import { Api } from 'model'
import { getRestClient } from 'registry'

import { preApiRequestAuthCheck } from 'appAdmin/component/SurveyEditor/hook/preApiRequestAuthCheck'
import { KEY_STATE_SURVEY_EMAIL_TEMPLATES } from 'appAdmin/common/keyState'

type EmailTemplatePatch = Patch

class SurveyEmailTemplateApi extends Api {
  async getAllWithDefaults(surveyId: string): Promise<{
    surveyTemplates: PropsOf<EmailTemplate>[]
    projectTemplates: PropsOf<EmailTemplate>[]
    systemTemplates: PropsOf<EmailTemplate>[]
    projectDefaultLang: string
  }> {
    return await this.getClient().get(
      `/email-template/survey/${surveyId}?includeDefaults=true`,
    )
  }

  async patch(surveyId: string, patches: EmailTemplatePatch[]) {
    return await this.getClient().patch(`/email-template/survey/${surveyId}`, {
      patches,
    })
  }
}

type Props = {
  surveyId?: string
  onPatchBufferChange?: (buffer: PatchBuffer) => void
}

type EmailTemplateState = {
  surveyTemplates: EmailTemplateCollection
  projectTemplates: EmailTemplateCollection
  systemTemplates: EmailTemplateCollection
  projectDefaultLang: string
}

/**
 * Email template-specific adapter for usePatchableState hook
 *
 * Provides patchable state management for survey email templates with:
 * - Automatic data fetching from email template API
 * - Patch buffering and persistence
 * - Optimistic updates
 * - Automatic retry logic
 * - Independent lifecycle from survey data
 *
 * Makes a single API call that fetches both survey templates and project defaults.
 *
 * @example
 * ```typescript
 * const { data: templates, bufferPatches } = useEmailTemplatePatchableState({ surveyId })
 * ```
 */
export function useEmailTemplatePatchableState({
  surveyId,
  onPatchBufferChange,
}: Props) {
  const { auth } = useAuth()

  const result = usePatchableState<EmailTemplateState, EmailTemplatePatch>({
    queryKey: [KEY_STATE_SURVEY_EMAIL_TEMPLATES, surveyId],
    entityId: surveyId,

    // Fetch email template data from API (single call returns survey, project, and system templates)
    fetchFn: async () => {
      if (!surveyId) {
        throw new Error('Survey ID is required')
      }

      const api = new SurveyEmailTemplateApi(getRestClient())
      const {
        surveyTemplates,
        projectTemplates,
        systemTemplates,
        projectDefaultLang,
      } = await api.getAllWithDefaults(surveyId)

      // Return all 3 tiers from single API call
      return {
        surveyTemplates: EmailTemplateCollection.fromArray(
          surveyTemplates.map((t) => new EmailTemplate(t)),
        ),
        projectTemplates: EmailTemplateCollection.fromArray(
          projectTemplates.map((t) => new EmailTemplate(t)),
        ),
        systemTemplates: EmailTemplateCollection.fromArray(
          systemTemplates.map((t) => new EmailTemplate(t)),
        ),
        projectDefaultLang,
      }
    },

    // Apply patches to survey email templates (project and system templates are read-only)
    applyPatchesFn: (patches, state) => {
      // Ensure survey templates collection is a proper instance (React Query cache may have plain object)
      const properCollection =
        state.surveyTemplates instanceof EmailTemplateCollection
          ? state.surveyTemplates
          : EmailTemplateCollection.fromArray([])

      const updatedSurveyTemplates = PatchApplierEmailTemplate.applyPatches(
        patches,
        properCollection,
      )

      // Return updated state with patched survey templates, keeping project and system templates unchanged
      return {
        surveyTemplates: updatedSurveyTemplates,
        projectTemplates: state.projectTemplates,
        systemTemplates: state.systemTemplates,
        projectDefaultLang: state.projectDefaultLang,
      }
    },

    // Persist patches to server via dedicated email template endpoint
    persistPatchesFn: async (patches) => {
      if (!surveyId) {
        throw new Error('Survey ID is required')
      }

      const promiseReject = preApiRequestAuthCheck(auth)
      if (promiseReject) return promiseReject

      // Use dedicated email template patch endpoint
      const api = new SurveyEmailTemplateApi(getRestClient())
      await api.patch(surveyId, patches)
    },

    // Configuration
    enabled: !!surveyId,
    refetchInterval: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    debounceMs: 2000,

    // Callbacks
    onPatchBufferChange,
  })

  // Extract survey, project, and system templates from combined state
  // Ensure they are proper collection instances (React Query cache may deserialize as plain objects)
  const surveyTemplates = result.data?.surveyTemplates
    ? result.data.surveyTemplates instanceof EmailTemplateCollection
      ? result.data.surveyTemplates
      : EmailTemplateCollection.fromArray([])
    : undefined

  const projectTemplates = result.data?.projectTemplates
    ? result.data.projectTemplates instanceof EmailTemplateCollection
      ? result.data.projectTemplates
      : EmailTemplateCollection.fromMap(
          (
            result.data.projectTemplates as unknown as {
              templates?: Record<string, EmailTemplate>
            }
          ).templates ||
            (result.data.projectTemplates as unknown as Record<
              string,
              EmailTemplate
            >),
        )
    : undefined

  const systemTemplates = result.data?.systemTemplates
    ? result.data.systemTemplates instanceof EmailTemplateCollection
      ? result.data.systemTemplates
      : EmailTemplateCollection.fromMap(
          (
            result.data.systemTemplates as unknown as {
              templates?: Record<string, EmailTemplate>
            }
          ).templates ||
            (result.data.systemTemplates as unknown as Record<
              string,
              EmailTemplate
            >),
        )
    : undefined

  const projectDefaultLang = result.data?.projectDefaultLang || 'en'

  return {
    ...result,
    data: surveyTemplates,
    projectTemplates,
    systemTemplates,
    projectDefaultLang,
  }
}
