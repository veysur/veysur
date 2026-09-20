# Timestamps

How dates and times are stored, transmitted, filtered, and displayed across the monorepo.

## Storage

- MySQL stores every timestamp in **UTC**.
- Schema `Date` fields carry an `At` / `From` / `To` / `Start` / `End` / `Until` suffix (or the
  bare lowercase form when nested). See the "Timestamp Field Naming" table in the root
  [`AGENTS.md`](../AGENTS.md).
- Any index on a `Date` field must set `typeHint` or range queries compare lexicographically. See
  `package/api/AGENTS.md`.

## Wire format

The API sends ISO-8601 UTC strings. The frontend never parses a naive (zone-less) date.

## Filtering: "today" and date ranges

`Project.timezone` (an IANA zone string, `SchemaProject.ts`, default `'UTC'`) is the reference
zone for date-range day boundaries, so every viewer of a shared project filters against the same
calendar day.

- Backend: `package/api/src/common/dateFilterUtils.ts` — `buildDateRangeQuery({ timezone })`.
- Frontend: `package/app/src/component/DateRangeFilter/dateRangePresets.ts` — `getPresetDates(preset, timezone)`.
- Edited at `/admin/setting/project` (`ProjectTimezoneForm`); captured from the browser at project
  creation.

Background: commits `b5758ad9`, `cc09a688`;
[ADR](decisions/2026/2026-08-28_timestamp-display-timezone.md).

## Display (`package/app`)

Format timestamps only through the helpers in
`package/app/src/common/formatDateTime.ts` (`formatDate`, `formatDateLong`, `formatDateTime`,
`formatDateTimeLong`, `formatCalendar`). No bare `momentTimezone(x).format(...)` in components.
Each takes an explicit IANA `timezone`; resolve it with the sub-app's `useDisplayTimezone()` hook:

| Sub-app | Zone shown | Hook resolves to |
|---|---|---|
| `appAdmin` | Project timezone | `useProjectDomain()?.timezone`, else the browser zone |
| `appAccount` | Viewer's browser zone | `Intl.DateTimeFormat().resolvedOptions().timeZone` |

The zone is stated **once per view**, not on every timestamp:

- list pages: `<TimezoneNotice timezone={tz} mode="project | local | fixed" />` near the table
- detail pages: an `({tz})` suffix on each section heading that contains timestamps

moment's locale is set to `en-gb` (`common/initMoment.ts`, imported by every sub-app entry point
and the jest setup), so `L`/`LL`/`ll` render `28 Aug 2026`.

## Anonymous survey responses

A response to a survey with the **Access → Anonymous** setting records no real
time. Every timestamp field (`createdAt`, `updatedAt`, `startedAt`,
`completedAt`) holds the fixed sentinel `ANONYMISED_TIMESTAMP_ISO`
(`1971-01-01T00:00:01Z`, `package/common/src/constants.ts`), so a response
cannot be correlated with any external record of when a participant took the
survey. `startedAt` / `completedAt` stay `null` until the response is
started / completed. `isAnonymisedTimestamp()` from the same module tests for
the sentinel; the admin UI renders "Anonymised" in its place. Full behaviour:
[`package/api/docs/anonymous-surveys.md`](../package/api/docs/anonymous-surveys.md).

## Out of scope for the display zone

- Respondent-entered date **answers** (`component/SurveyResponse/formatAnswer.ts`): shown as
  captured, they are data, not system timestamps.
