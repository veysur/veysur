# Survey Language Loading

## Overview

Survey L10n fields (question text, answer option labels, etc.) are stored per-language in separate `SurveyLanguage` database records, not embedded in the survey document. A survey with many languages can accumulate substantial translation data, so the API never returns all languages at once.

Instead, every survey GET request returns L10n objects populated with **at most two language variants**:

- The **default language** — always included as the fallback
- The **active language** — the language currently being edited or taken

Components call `L10n.getLang(activeLang, defaultLang)` to display text; the fallback to the default is automatic if a translation is missing.

---

## API layer

`GET /survey/:id?lang=fr&defaultLang=en`

- `lang` — the language the caller wants to view or edit
- `defaultLang` — the survey's configured default language (used as fallback)

`ServiceSurvey.getOne()` delegates to `ServiceSurveyLanguage.getSurveyWithLanguages()`:

```
getSurveyWithLanguages(survey, projectId, lang, defaultLang)
  → deduplicates [lang, defaultLang] into a unique set
  → fetches only those SurveyLanguage records from the database
  → calls mergeSurveyLanguageIntoSurvey(survey, languageRecords)
  → returns survey with L10n fields populated for those two languages
```

`mergeSurveyLanguageIntoSurvey()` iterates each returned `SurveyLanguage` record and calls `L10n.setLang(text, languageCode)` for every translatable field (title, group descriptions, question text, answer option labels, etc.).

When `lang === defaultLang`, only one language record is fetched and the L10n objects contain a single variant.

Key files:
- `package/api/src/model/service/core/ServiceSurveyLanguage.ts` — `getSurveyWithLanguages()`
- `package/common/src/util/mergeSurveyLanguageIntoSurvey.ts` — merge logic
- `package/common/src/model/constructor/L10n.ts` — sparse language dictionary

---

## Survey editor flow

The editor stores three language fields in the Zustand store (`useSurveyEditorStore`):

| Field | Purpose |
|-------|---------|
| `langDefault` | Survey's configured default language; initialised from `survey.language.default` |
| `langFetch` | The non-default language currently loaded in the React Query cache |
| `langEditing` | The language the user is actively editing (drives UI rendering) |

`langFetch` and `langDefault` form part of the React Query key in `useSurveyPatchableState`:

```typescript
queryKey: [KEY_STATE_SURVEY_EDITING, langFetch, langDefault]
```

Changing `langFetch` changes the key, which React Query treats as a new query and triggers a fetch.

**When the user selects a language in `SurveyLanguageSelector`:**

1. If the selected language is already loaded (`langDefault` or `langFetch`), only `langEditing` is updated — no fetch occurs.
2. If the selected language is new, the current cache entry is pre-seeded under the new key (to avoid a blank flash), `langFetch` is updated to the new language, and `langEditing` is updated. The changed key triggers a fresh API call with `lang=<new>` and `defaultLang=<default>`.

This means switching between the default language and any single non-default language never triggers more than one extra fetch, and switching back to the default language is always instant.

`PageSurveyEditPreview` renders the reusable `Survey` component (also used for survey taking), which keeps its own local language state seeded from an `initLanguage` prop. To keep the preview's language selector in sync with the rest of the editor across navigation (the `Survey` subtree remounts when leaving and returning to the Preview route, but `useSurveyEditorStore` does not), `PageSurveyEditPreview` passes `initLanguage={langEditing}` and calls `setLangEditing(lang)` alongside `switchLangFetch(lang)` in its language-change handler.

Key files:
- `package/app/src/appAdmin/component/SurveyEditor/hook/useSurveyEditorStore.ts`
- `package/app/src/appAdmin/component/SurveyEditor/hook/useSurveyPatchableState.ts`
- `package/app/src/appAdmin/component/SurveyEditor/SurveyLanguageSelector.tsx`
- `package/app/src/appAdmin/page/PageSurveyEdit/PageSurveyEditPreview.tsx`

---

## Participant / snapshot flow

Survey taking uses the same two-language pattern via the published snapshot:

`GET /survey-participant-snapshot/:surveyId?lang=fr`

`ServiceSurveyParticipantSnapshot.get()` resolves:

```
activeLang = lang (from query param or participant record)
defaultLang = snapshot.surveyPartial.language.default  // frozen at publish time
```

It then fetches `SurveyLanguageSnapshot` records for those two language codes and merges them into the survey data using the same `mergeSurveyLanguageIntoSurvey` logic.

The default language comes from the snapshot, not the current survey settings, so the participant always sees the language that was configured when the survey was published.

Key files:
- `package/api/src/model/service/core/ServiceSurveyParticipantSnapshot.ts`
- `package/app/src/appSurvey/api/SurveyParticipantSnapshotApi.ts`
- `package/app/src/appSurvey/hook/useSurveyParticipantSnapshotPublished.ts`

---

## Related

- [ADR: survey language lazy loading](decisions/2026/2026-04-30_survey-language-lazy-loading.md)
- [Survey publishing](survey-publishing.md) — how `SurveyLanguageSnapshot` records are created at publish time
- [Import/export](../package/api/docs/import-export/import-export-system.md) — how all language variants are handled in bulk exports
