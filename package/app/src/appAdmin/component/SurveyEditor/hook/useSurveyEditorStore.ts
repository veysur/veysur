import { create } from 'zustand'
import {
  Iso639v1,
  SettingSurvey,
  Survey,
  PatchBuffer,
  Patch,
} from 'veysur-common'
import { VirtuosoHandle } from 'react-virtuoso'
import { UseMutationResult } from '@tanstack/react-query'

import { SurveyAdapter } from 'appAdmin/component/SurveySettingShared'
import { createSurveyOperations } from './createSurveyOperations'
import { SurveyFocus } from './useSurveyEditorFocus'
import {
  SURVEY_ENTITY_TYPE_TITLE,
  SURVEY_ENTITY_TYPE_WELCOME,
  SURVEY_ENTITY_TYPE_SECTION,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_CONTENT,
  SURVEY_ENTITY_TYPE_THANK_YOU,
} from '../constant'

export type SurveyEditorStore = {
  surveyAdapter?: SurveyAdapter
  defaults: SettingSurvey
  survey?: Survey
  operations?: ReturnType<typeof createSurveyOperations>
  surveyFocus?: SurveyFocus
  langEditing: string
  langFetch: string
  langDefault: string
  langDefaultSeededFor?: string
  virtuosoRef?: VirtuosoHandle | null
  isLoading: boolean
  isFetching: boolean
  patchBuffer?: PatchBuffer
  patchMutation?: UseMutationResult<void, unknown, Patch[]>
  uiPrefs: {
    showQuestionDetails: boolean
    collapsedGroups: Set<string>
  }
  validationErrors: {
    [entityType: string]: {
      [entityId: string]: {
        [field: string]: string[]
      }
    }
  }
  childNavigationBlocker: {
    condition: boolean
    message: string
    onSaveAndContinue?: () => Promise<void>
  } | null
  setDefaults: (defaults: SettingSurvey) => void
  setSurvey: (survey: Survey | undefined) => void
  setOperations: (operations: SurveyEditorStore['operations']) => void
  setSurveyFocus: (surveyFocus: SurveyFocus) => void
  setLangEditing: (langEditing: string) => void
  setLangFetch: (langFetch: string) => void
  setLangDefault: (defaultLang: string) => void
  setVirtuosoRef: (ref: VirtuosoHandle | null) => void
  setIsLoading: (isLoading: boolean) => void
  setIsFetching: (isFetching: boolean) => void
  setPatchBuffer: (patchBuffer: PatchBuffer) => void
  setPatchMutation: (patchMutation: SurveyEditorStore['patchMutation']) => void
  setUiPrefs: (prefs: Partial<SurveyEditorStore['uiPrefs']>) => void
  setShowQuestionDetails: (value: boolean) => void
  setCollapsedGroups: (groups: Set<string>) => void
  setValidationError: (
    entityType: string,
    entityId: string,
    field: string,
    errors: string[],
  ) => void
  clearValidationError: (
    entityType: string,
    entityId: string,
    field: string,
  ) => void
  clearAllValidationErrors: () => void
  setChildNavigationBlocker: (
    childNavigationBlocker: SurveyEditorStore['childNavigationBlocker'],
  ) => void
  scrollToIndex: (index: number) => void
  scrollToEntity: (
    entityType: string,
    entityId: string | undefined,
    survey: Survey,
    presentation: ReturnType<Survey['getPresentation']>,
  ) => void
}

// Only seed langDefault once per survey — it also drives the survey query
// key, so re-deriving it from every fetch/defaults load would feed the
// fetched result back into the key that produced it.
function seedLangDefault(
  survey: Survey | undefined,
  surveyAdapter: SurveyAdapter | undefined,
  langDefaultSeededFor: string | undefined,
): Pick<SurveyEditorStore, 'langDefault' | 'langDefaultSeededFor'> | object {
  if (!survey?._id || langDefaultSeededFor === survey._id) return {}

  return {
    langDefault: surveyAdapter?.getValue<string>('language', 'default') || '',
    langDefaultSeededFor: survey._id,
  }
}

export const useSurveyEditorStore = create<SurveyEditorStore>((set, get) => {
  return {
    surveyAdapter: undefined,
    defaults: new SettingSurvey(),
    survey: undefined,
    operations: undefined,
    surveyFocus: undefined,
    langEditing: '',
    langFetch: '',
    langDefault: '',
    langDefaultSeededFor: undefined,
    virtuosoRef: null,
    isLoading: false,
    isFetching: false,
    patchBuffer: undefined,
    patchMutation: undefined,
    uiPrefs: {
      showQuestionDetails: false,
      collapsedGroups: new Set<string>(),
    },
    validationErrors: {},
    childNavigationBlocker: null,
    setDefaults: (defaults) => {
      const { survey, langDefaultSeededFor } = get()
      const surveyAdapter = survey
        ? new SurveyAdapter(survey, defaults)
        : undefined
      set(() => ({
        defaults,
        surveyAdapter,
        ...seedLangDefault(survey, surveyAdapter, langDefaultSeededFor),
      }))
    },
    setSurvey: (survey) => {
      const { defaults, langDefaultSeededFor } = get()
      const surveyAdapter = survey
        ? new SurveyAdapter(survey, defaults)
        : undefined
      set(() => ({
        survey,
        surveyAdapter,
        ...seedLangDefault(survey, surveyAdapter, langDefaultSeededFor),
      }))
    },
    setOperations: (operations) => set(() => ({ operations })),
    setSurveyFocus: (surveyFocus) => set(() => ({ surveyFocus })),
    setLangEditing: (langEditing) =>
      set(() =>
        Object.keys(Iso639v1).includes(langEditing) ? { langEditing } : {},
      ),
    setLangFetch: (langFetch) =>
      set(() =>
        Object.keys(Iso639v1).includes(langFetch) ? { langFetch } : {},
      ),
    setLangDefault: (langDefault) =>
      set(() =>
        Object.keys(Iso639v1).includes(langDefault) ? { langDefault } : {},
      ),
    setVirtuosoRef: (ref) => set(() => ({ virtuosoRef: ref })),
    setIsLoading: (isLoading) => set(() => ({ isLoading })),
    setIsFetching: (isFetching) => set(() => ({ isFetching })),
    setPatchBuffer: (patchBuffer) => set(() => ({ patchBuffer })),
    setPatchMutation: (patchMutation) => set(() => ({ patchMutation })),
    setUiPrefs: (prefs) =>
      set((state) => ({
        uiPrefs: {
          ...state.uiPrefs,
          ...prefs,
        },
      })),
    setShowQuestionDetails: (value) =>
      set((state) => ({
        uiPrefs: {
          ...state.uiPrefs,
          showQuestionDetails: value,
        },
      })),
    setCollapsedGroups: (groups) =>
      set((state) => ({
        uiPrefs: {
          ...state.uiPrefs,
          collapsedGroups: groups,
        },
      })),
    setValidationError: (entityType, entityId, field, errors) => {
      set((state) => ({
        validationErrors: {
          ...state.validationErrors,
          [entityType]: {
            ...state.validationErrors[entityType],
            [entityId]: {
              ...state.validationErrors[entityType]?.[entityId],
              [field]: errors,
            },
          },
        },
      }))
    },
    clearValidationError: (entityType, entityId, field) =>
      set((state) => {
        const newErrors = { ...state.validationErrors }
        if (newErrors[entityType]?.[entityId]?.[field]) {
          delete newErrors[entityType][entityId][field]
          // Clean up empty objects
          if (Object.keys(newErrors[entityType][entityId]).length === 0) {
            delete newErrors[entityType][entityId]
          }
          if (Object.keys(newErrors[entityType]).length === 0) {
            delete newErrors[entityType]
          }
        }
        return { validationErrors: newErrors }
      }),
    clearAllValidationErrors: () => {
      set(() => ({ validationErrors: {} }))
    },
    setChildNavigationBlocker: (childNavigationBlocker) =>
      set(() => ({ childNavigationBlocker })),
    scrollToIndex: (index) => {
      const { virtuosoRef } = get()
      if (virtuosoRef) {
        virtuosoRef.scrollToIndex({
          index,
          align: 'start',
          behavior: 'smooth',
        })
      }
    },
    scrollToEntity: (entityType, entityId, survey, presentation) => {
      const { virtuosoRef } = get()
      if (!virtuosoRef || !survey?.sections.groups()) return

      let index = 0

      if (presentation?.title === true) {
        if (entityType === SURVEY_ENTITY_TYPE_TITLE) {
          virtuosoRef.scrollToIndex({
            index: 0,
            align: 'start',
            behavior: 'smooth',
          })
          return
        }
        index++
      }

      if (presentation?.welcomeMessage) {
        if (entityType === SURVEY_ENTITY_TYPE_WELCOME) {
          virtuosoRef.scrollToIndex({
            index,
            align: 'start',
            behavior: 'smooth',
          })
          return
        }
        index++
      }

      for (
        let groupIndex = 0;
        groupIndex < survey.sections.groups().length;
        groupIndex++
      ) {
        const group = survey.sections.groups()[groupIndex]

        if (
          entityType === SURVEY_ENTITY_TYPE_SECTION &&
          group._id === entityId
        ) {
          virtuosoRef.scrollToIndex({
            index,
            align: 'start',
            behavior: 'smooth',
          })
          return
        }
        index++

        // Questions and content elements are interleaved in element order.
        const elements = survey.elements.getBySectionId(group._id)
        for (const element of elements) {
          if (
            (entityType === SURVEY_ENTITY_TYPE_ELEMENT ||
              entityType === SURVEY_ENTITY_TYPE_CONTENT) &&
            element._id === entityId
          ) {
            virtuosoRef.scrollToIndex({
              index,
              align: 'start',
              behavior: 'smooth',
            })
            return
          }
          index++
        }

        index++
      }

      if (entityType === SURVEY_ENTITY_TYPE_THANK_YOU) {
        virtuosoRef.scrollToIndex({ index, align: 'start', behavior: 'smooth' })
        return
      }
    },
  }
})
