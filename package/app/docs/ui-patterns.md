# UI/UX Patterns

Common UI patterns used across VeySur admin entity pages.

---

## Full-Page Empty State (GoldenEmptyState)

Use `GoldenEmptyState` when a page or section has no data and should prompt the user to take a first action. It centres content vertically using the golden ratio and wraps it in a card.

### Structure

```
GoldenCentered
  └── Card
        └── CardContent
              ├── icon circle (bg-muted, rounded-full)
              ├── h2 title
              ├── p description
              └── action (optional CTA button)
```

### Usage

```tsx
import { GoldenEmptyState } from 'component/GoldenEmptyState'
import { ClipboardList, Plus } from 'lucide-react'
;<GoldenEmptyState
  icon={ClipboardList}
  title="Create your first survey"
  message="See what's possible. It all starts with a question."
  action={
    <Button asChild>
      <Link to="/survey/new">
        <Plus className="h-4 w-4 mr-2" />
        Create Survey
      </Link>
    </Button>
  }
/>
```

### When to use

- Entity list page with zero records and a clear creation CTA
- Stat/analytics view with no data yet (omit `action`)
- Do **not** use for inline empty states within a card or table row — use `EmptyState` there instead

### Key Files

- `src/component/GoldenEmptyState/GoldenEmptyState.tsx` — component source
- `src/appAdmin/component/Survey/SurveyListView.tsx` — list + CTA example
- `src/appAdmin/page/PageSurveyEdit/PageSurveyEditParticipant.tsx` — list + CTA example
- `src/appAdmin/page/PageSurveyEdit/PageSurveyEditPublication.tsx` — no CTA example
- `src/appAdmin/component/SurveyStat/SurveyStatEmptyState.tsx` — no CTA example
- `src/appAccount/page/PageProjectList.tsx` — account app example

---

## Entity Mass Action Buttons

Action buttons placed in the right slot of `PageHeader`, scoped to an entity type. Each button triggers a specific dialog (import, add, generate, export, send email).

### Structure

```
PageHeader
  └── right slot
        └── ButtonGroup (shadcn)
              ├── Button (icon + label)
              └── Button (icon + label)
```

- Use `ButtonGroup` when grouping 2+ related buttons; single buttons render standalone
- Each button opens its own dialog (`useState` open flag per dialog)
- Conditional buttons render only when applicable (e.g. Export only if data exists)

### Icon Convention

| Action         | Icon       |
| -------------- | ---------- |
| Add            | `Plus`     |
| Import         | `Upload`   |
| Generate       | `TestTube` |
| Export         | `Download` |
| Send Invites   | `Mail`     |
| Send Reminders | `Bell`     |

### Examples

| Entity      | Page / Component            | Buttons                                                        |
| ----------- | --------------------------- | -------------------------------------------------------------- |
| Survey      | `PageSurvey`                | Import                                                         |
| Survey      | `PageSurveyNew`             | Import                                                         |
| Participant | `ParticipantPageHeader`     | Add, Import, Generate, Export†, Send Invites†, Send Reminders† |
| Response    | `PageSurveyEditResponse`    | Add†                                                           |
| Publication | `PageSurveyEditPublication` | Import                                                         |

† conditional on page state

### Key Files

- `src/appAdmin/component/PageHeader.tsx` — layout component (left: icon/title, right: slot for buttons)
- `src/component/shadcn/button-group.tsx` — groups adjacent buttons with seamless borders
- `src/appAdmin/component/SurveyParticipant/ParticipantPageHeader.tsx` — most complete example (6 buttons, conditional logic)
- `src/appAdmin/page/PageSurvey/PageSurvey.tsx`
- `src/appAdmin/page/PageSurveyEdit/PageSurveyEditResponse.tsx`
- `src/appAdmin/page/PageSurveyEdit/PageSurveyEditPublication.tsx`

---

## Entity List Mass Action Dropdown

A right-aligned dropdown above an entity table for applying bulk actions to selected rows.

### Structure

```
MassActionBar (flex row)
  ├── left: SearchBar (optional)
  └── right: DropdownMenu
              ├── DropdownMenuTrigger → Button "Action (N)"
              └── DropdownMenuContent
                    └── DropdownMenuItem (disabled when N=0)
```

### Behaviour

- Rows have a checkbox; selection tracked via `useSelection` hook (`selectedIds: Set`)
- Trigger button label shows selection count: `"Action (2)"`
- Menu items disabled when `selectedIds` is empty
- Selection cleared when page or filter changes
- Destructive actions (Delete) open an `AlertDialog` for confirmation before executing

### Confirmation Dialog Pattern (destructive actions)

```
AlertDialog
  ├── title: "Delete N items?"
  ├── description: confirmation message
  └── actions: Cancel | Delete (destructive)
```

### Examples

| Entity      | Component               | Actions |
| ----------- | ----------------------- | ------- |
| Participant | `ParticipantMassAction` | Delete  |
| Response    | `ResponseMassAction`    | Delete  |
| Publication | `PublicationMassAction` | Delete  |

### Key Files

- `src/appAdmin/component/SurveyParticipant/ParticipantMassAction.tsx`
- `src/appAdmin/component/SurveyResponse/ResponseMassAction.tsx`
- `src/appAdmin/component/SurveyPublication/PublicationMassAction.tsx`
- Delete dialogs (AlertDialog):
  - `src/appAdmin/component/SurveyParticipant/ParticipantDeleteDialog.tsx`
  - `src/appAdmin/component/SurveyResponse/ResponseDeleteDialog.tsx`
  - `src/appAdmin/component/SurveyPublication/PublicationDeleteDialog.tsx`

---

## Filters Toolbar

A single "Filters" button above a data view that opens a popover with filter controls. Right-aligned, placed left of the mass action dropdown when both are present.

### Structure

```
SurveyResponseFilterToolbar
  └── Button "Filters ▾" (shows active filter summary)
        └── Popover (align="end")
              ├── Completion Status filter (optional)
              ├── Date Range filter (optional)
              │     ├── Preset selector (All Time / Today / Last 7 / Last 30 / Last 90 / Custom)
              │     ├── Date field selector (Created / Completed / Updated)
              │     └── Custom date inputs (only when preset = Custom)
              └── "Apply Filters" button
```

### Behaviour

- Changes are staged locally while the popover is open; committed only when "Apply Filters" is clicked
- Button label shows active filter summary: `"Filters (Completed only • Date range set)"`
- Filter state managed by `useSurveyPageFilters` / `useDateFilter` hooks, persisted to URL search params
- Completion status filter is intentionally NOT persisted to URL

### Layout (with mass action)

```
<div flex justify-between>
  <SearchBar />                         ← left
  <div flex gap-3>
    <SurveyResponseFilterToolbar />     ← right, before mass action
    <ResponseMassAction />              ← right, after filter
  </div>
</div>
```

### Examples

| Page                     | Filter Types            | Paired With          |
| ------------------------ | ----------------------- | -------------------- |
| `PageSurveyEditResponse` | Completion + Date Range | `ResponseMassAction` |
| `PageSurveyEditStat`     | Completion + Date Range | —                    |
| `PageSurvey`             | Date Range only         | —                    |

### Key Files

- `src/appAdmin/component/SurveyResponse/SurveyResponseFilterToolbar.tsx`
- `src/appAdmin/component/SurveyResponse/hook/useSurveyPageFilters.ts` — URL-aware filter state
- `src/appAdmin/component/Survey/hook/useDateFilter.ts` — simpler date-only variant
- `src/appAdmin/component/SurveyStat/DateRangeFilterControl.tsx` — reusable date range sub-component
- `src/appAdmin/page/PageSurveyEdit/PageSurveyEditResponse.tsx` (layout reference)

---

## Search Input Debouncing

Any search input that triggers an API request must debounce its value using `useDebounce` from `common`. This prevents a request on every keystroke.

### Hook

```ts
import { useDebounce } from 'common'

const [searchQuery, setSearchQuery] = useState('')
const debouncedSearch = useDebounce(searchQuery) // 300ms default
```

`useDebounce<T>(value: T, delay?: number): T` — delays the returned value by `delay` ms (default 300). The hook lives in `src/common/useDebounce.ts` and is exported from `src/common/index.ts`.

### Resetting pagination on search change

When a page uses pagination alongside search, reset to page 1 when the debounced value changes:

```ts
useEffect(() => {
  pagination.setPage(1)
}, [debouncedSearch])
```

### Full pattern

```tsx
const [searchQuery, setSearchQuery] = useState('')
const debouncedSearch = useDebounce(searchQuery)

useEffect(() => {
  pagination.setPage(1)
}, [debouncedSearch])

const { data } = useEntityList({ search: debouncedSearch, page, perPage })

<Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
```

### Anti-patterns to avoid

```ts
// ❌ storing timer on a function object
clearTimeout((handleSearchChange as any)._timer)
;(handleSearchChange as any)._timer = setTimeout(...)

// ❌ inline useEffect + setTimeout duplicated per component
useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
  return () => clearTimeout(timer)
}, [searchQuery])
```

### Applies to

| Page                                                | SPA         |
| --------------------------------------------------- | ----------- |
| `page/PageSurvey/PageSurvey.tsx`                    | appAdmin    |
| `page/PageSurveyEdit/PageSurveyEditParticipant.tsx` | appAdmin    |
| `page/PageSurveyEdit/PageSurveyEditResponse.tsx`    | appAdmin    |
| `page/PageSurveyEdit/PageSurveyEditStat.tsx`        | appAdmin    |
