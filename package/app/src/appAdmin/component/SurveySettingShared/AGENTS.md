# Survey Settings Architecture

## Overview

The survey settings system manages two distinct types of configuration data:

1. **Default Settings** (`SettingSurvey`) - Global defaults for new surveys
2. **Survey-Specific Settings** (`Survey`) - Individual survey overrides

These are stored separately but presented through a unified interface using the Adapter pattern.

## Key Components

### Pages

#### Default Settings Page

- **Page**: [PageSettingSurvey.tsx](../../page/PageSetting/PageSettingSurvey.tsx)
- **Component**: [SettingSurvey.tsx](../SettingSurvey/SettingSurvey.tsx)
- **Purpose**: Configure global default settings that apply to all new surveys
- **Data Source**: `SettingSurvey` record stored in database
- **Adapter**: Uses `SettingSurveyAdapter`

#### Survey-Specific Settings Page

- **Page**: [PageSurveyEditSetting.tsx](../../page/PageSurveyEdit/PageSurveyEditSetting.tsx)
- **Component**: [SurveySetting.tsx](../SurveySetting/SurveySetting.tsx)
- **Purpose**: Configure settings for a specific survey (overrides defaults)
- **Data Source**: Settings stored directly on the `Survey` record
- **Adapter**: Uses `SurveyAdapter` with reference to default settings

## Adapter Pattern

The `SettingsDataAdapter<T>` interface provides a unified way to access settings data:

```typescript
interface SettingsDataAdapter<T> {
  language?: { options?: string[] | null; default?: string | null }
  presentation?: { format?: string | null; [key: string]: any }
  participant?: { [key: string]: any }
  data?: { [key: string]: any }
  access?: { [key: string]: any }
  schedule?: { [key: string]: any }
  dataPolicy?: { [key: string]: any }
  legalNotice?: { [key: string]: any }
  notify?: { [key: string]: any }
  getValue?: (section: string, field: string) => any
  getDefault?: (section: string, field: string) => any
  source: T
}
```

### Adapter Implementations

#### `SettingSurveyAdapter`

Wraps a `SettingSurvey` record for the default settings page.

```typescript
class SettingSurveyAdapter implements SettingsDataAdapter<SettingSurvey> {
  constructor(public source: SettingSurvey) {}

  get language() {
    return this.source.language
  }
  get presentation() {
    return this.source.presentation
  }
  get participant() {
    return this.source.participant
  }
  get data() {
    return this.source.data
  }
  get access() {
    return this.source.access
  }
  get schedule() {
    return this.source.schedule
  }
  get dataPolicy() {
    return this.source.dataPolicy
  }
  get legalNotice() {
    return this.source.legalNotice
  }
  get notify() {
    return this.source.notify
  }
}
```

**Usage**:

```typescript
const data = new SettingSurveyAdapter(settingSurvey)
```

#### `SurveyAdapter`

Wraps a `Survey` record with reference to default settings, providing automatic fallback.

```typescript
class SurveyAdapter implements SettingsDataAdapter<Survey> {
  constructor(
    public source: Survey,
    public defaults: SettingSurvey,
  ) {}

  get language() {
    return this.source.language
  }
  get presentation() {
    return this.source.presentation
  }
  // ... etc

  getValue(section: string, field: string) {
    const surveyValue = this.source[section]?.[field]
    return surveyValue ?? this.defaults?.[section]?.[field]
  }

  getDefault(section: string, field: string) {
    return this.defaults?.[section]?.[field]
  }
}
```

**Usage**:

```typescript
const surveyAdapter = useSurveyEditorStore((state) => state.surveyAdapter)
```

## Zustand Store Integration

The `useSurveyEditorStore` automatically creates and maintains a `SurveyAdapter` instance:

```typescript
type SurveyEditorStore = {
  surveyAdapter?: SurveyAdapter
  survey?: Survey
  defaults: SettingSurvey
  // ...
}
```

The store automatically recreates the adapter when either the survey or defaults change:

```typescript
setSurvey: (survey) => {
  const { defaults } = get()
  const surveyAdapter = survey ? new SurveyAdapter(survey, defaults) : undefined
  set(() => ({ survey, surveyAdapter }))
},
setDefaults: (defaults) => {
  const { survey } = get()
  const surveyAdapter = survey ? new SurveyAdapter(survey, defaults) : undefined
  set(() => ({ defaults, surveyAdapter }))
}
```

## Using the Adapters

### Accessing Settings with Automatic Fallback

Use `getValue()` to get the survey value with automatic fallback to defaults:

```typescript
const surveyAdapter = useSurveyEditorStore((state) => state.surveyAdapter)
const lang = surveyAdapter?.getValue('language', 'default')
// Returns survey value if set, otherwise falls back to default
```

**Key Features**:

- Uses nullish coalescing (`??`) to preserve intentional falsy values (`false`, `0`, `''`)
- Only falls back when value is `null` or `undefined`
- Eliminates manual fallback code throughout the codebase

### Accessing Default Values Explicitly

Use `getDefault()` when you need explicit access to the default value:

```typescript
const defaultFormat = adapter.getDefault('presentation', 'format')
const defaultLanguage = adapter.getDefault('language', 'default')
```

**Use cases**:

- Display default values as placeholders
- Show "Using default" indicators
- Reset fields to defaults
- Compare current values against defaults

### Direct Property Access

Access properties directly when you need the raw survey value:

```typescript
const lang = adapter.language?.default
```

**Use when**:

- You need to distinguish between "not set" and "set to default value"
- You want to handle fallback logic yourself

## Data Flow

### Default Settings Flow

```
PageSettingSurvey
  ↓
useAdminSettingSurvey() → loads SettingSurvey from API
  ↓
SettingSurveyAdapter(settingSurvey)
  ↓
SettingSurvey component
  ↓
BaseSettingsStandalone → renders settings UI
  ↓
Updates saved back to SettingSurvey record
```

### Survey-Specific Settings Flow

```
PageSurveyEditContainer
  ↓
useSurveyEditor() → loads survey → calls setSurvey()
useAdminSettingSurvey() → loads defaults → calls setDefaults()
  ↓
useSurveyEditorStore automatically creates SurveyAdapter(survey, defaults)
  ↓
PageSurveyEditSetting
  ↓
SurveySetting component gets surveyAdapter from store
  ↓
BaseSettingsNested → renders settings UI (uses getValue() and getDefault())
  ↓
Updates saved to Survey record via operations
```

## Setting Sections

Both adapters expose these setting sections:

- **language** - Language options and default language
- **presentation** - Display format and visual settings
- **participant** - Participant access and authentication
- **data** - Data collection and storage settings
- **access** - Survey access controls
- **schedule** - Publish schedule controlling when the survey is accessible
- **dataPolicy** - Data policy text (localized)
- **legalNotice** - Legal notice text (localized)
- **notify** - Notification settings

## Testing

### Type Checking

```bash
cd repo/app && pnpm typecheck
```

### Manual Testing Checklist

1. **Settings page loads correctly**
   - Default settings page displays all sections
   - Survey-specific settings page displays all sections

2. **Default values work**
   - Undefined survey values fall back to defaults
   - Null survey values fall back to defaults
   - Explicit falsy values (false, 0, '') are preserved

3. **Editing works**
   - Changes to settings are reflected in UI
   - Changes persist after save
   - Validation works correctly

4. **Default indicators**
   - UI shows when using default values
   - UI shows when overriding defaults

5. **Reset functionality**
   - Reset to default works correctly
   - Cleared values fall back to defaults

## Benefits

1. **Separation of Concerns** - Defaults and survey-specific settings are stored separately
2. **Unified Interface** - Components consume both types of data through the same interface
3. **Automatic Fallback** - No manual fallback code needed
4. **Single Source of Truth** - Survey + defaults combined in one adapter object
5. **Type Safety** - TypeScript ensures correct data structure
6. **Centralized Logic** - Default fallback logic in one place (`SurveyAdapter.getValue`)
7. **Centralized State** - Survey adapter maintained automatically in Zustand store
