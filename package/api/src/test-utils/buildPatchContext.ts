import { DataSourceContext } from 'mzen-om'

import { PatchContext } from 'model/service/core/ServiceSurvey/PatchContext'
import { ServiceSurveyLanguage } from 'model/service/core/ServiceSurveyLanguage'

/**
 * Shared typed factory for the `PatchContext` that every `ServiceSurvey` patch
 * handler takes. Replaces the per-file `... as unknown as PatchContext` blocks.
 *
 * Only the repo methods and survey-language methods a handler actually calls
 * need mocking — pass them through `repos` / `l10n`; missing survey-language
 * methods default to a resolved `jest.fn()`, and each repo gets a `name` +
 * `initSchema` + `schema` stub so `updateHandler` runs. The unavoidable
 * boundary casts (mzen-om's `DataSourceContext`, the partial repo mocks, the
 * partial `ServiceSurveyLanguage` mock) live here once instead of at each call
 * site.
 */

type RepoMock = Record<string, unknown>
type L10nMocks = Record<string, jest.Mock>

export interface BuildPatchContextOptions {
  surveyId?: string
  projectId?: string
  userId?: string
  repos?: {
    repoSurvey?: RepoMock
    repoSurveyElement?: RepoMock
    repoSurveySection?: RepoMock
    repoSurveyEmailTemplate?: RepoMock
  }
  l10n?: L10nMocks
  fileTracker?: { filesAdded?: Set<string>; filesRemoved?: Set<string> }
}

export interface BuiltPatchContext {
  ctx: PatchContext
  /** The survey-language service mock (`upsertFields`, `removeEntityFields`, …). */
  l10n: L10nMocks
  /** The repo mocks, keyed as on `ctx.repos`. */
  repos: Record<string, RepoMock>
}

const resolvedFn = () => jest.fn().mockResolvedValue(undefined)

const repoMock = (name: string, methods: RepoMock = {}): RepoMock => ({
  name,
  schema: undefined,
  initSchema: jest.fn(),
  ...methods,
})

export function buildPatchContext(
  options: BuildPatchContextOptions = {},
): BuiltPatchContext {
  const l10n: L10nMocks = {
    upsertFields: resolvedFn(),
    removeEntityFields: resolvedFn(),
    upsertAnswerOptionImage: resolvedFn(),
  }
  for (const [key, fn] of Object.entries(options.l10n ?? {})) {
    if (fn) l10n[key] = fn
  }

  const repos: Record<string, RepoMock> = {
    repoSurvey: repoMock('survey', {
      updateOne: resolvedFn(),
      ...options.repos?.repoSurvey,
    }),
    repoSurveyElement: repoMock(
      'surveyElement',
      options.repos?.repoSurveyElement,
    ),
    repoSurveySection: repoMock(
      'surveySection',
      options.repos?.repoSurveySection,
    ),
    repoSurveyEmailTemplate: repoMock(
      'emailTemplate',
      options.repos?.repoSurveyEmailTemplate,
    ),
  }

  const ctx: PatchContext = {
    surveyId: options.surveyId ?? 'survey-1',
    projectId: options.projectId ?? 'project-1',
    userId: options.userId ?? 'user-1',
    context: {} as DataSourceContext,
    repos: repos as unknown as PatchContext['repos'],
    getL10nService: () => l10n as unknown as ServiceSurveyLanguage,
    fileTracker: {
      filesAdded: options.fileTracker?.filesAdded ?? new Set<string>(),
      filesRemoved: options.fileTracker?.filesRemoved ?? new Set<string>(),
    },
  }

  return { ctx, l10n, repos }
}
