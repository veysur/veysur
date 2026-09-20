# Survey Constructor Agent Guide

This document explains the Survey constructor architecture, including the nullable properties system and relationship with SurveySetting.

## Architecture Overview

The Survey constructor has been refactored to support a sophisticated nullable properties system that allows individual SurveySetting properties to be null while providing seamless fallbacks to global defaults.

### Key Components

1. **Survey Base Class** (`SurveyBase.ts`)
2. **SurveySetting Integration**
3. **Nullable Properties System**
4. **Global Defaults Management**

### Element leaf classes

`SurveyQuestion` and `SurveyContent` both extend **`SurveyElementBase`**, which
holds the fields common to every ordered element (`_id`, `surveyId`, `code`,
`text`, `sectionId`, `condition`, `attributes`, …) and the shared immutable
mutators. The shared visibility-condition (`updateCondition` / `clearCondition`)
and attribute (`setAttribute` / `deleteAttribute`) mutators are supplied by the
`entityConditionMethods` / `entityAttributeMethods` entity mixins in
`Survey/mixin/`, which `SurveySection` and `SurveySubquestion` also apply
(section: both; subquestion: attributes only). All of these delegate to
`ImmutableEntity.withChanges()`, the leaf equivalent of `SurveyBase.update()`.

## Nullable Properties System

### Core Concept

Survey accepts null values for any property inherited from SurveySetting, enabling flexible configuration where only specific settings need to be customized while others fall back to global defaults.

```typescript
// Example: Survey with selective property overrides
const survey = new Survey({
  _id: '1',
  projectId: '1',
  createdById: '1',
  name: 'My Survey',
  title: { en: 'Survey Title' },

  // Override only language default, let options fall back to global default
  language: {
    default: 'fr',
    options: null, // Will use global default
  },

  // Let entire presentation object use global defaults
  presentation: null,

  // Override specific access settings
  access: {
    anonymous: true,
    open: null, // Will use global default
    publicReg: null, // Will use global default
  },
})
```

### Nullable Property Types

All SurveySetting-inherited properties support granular nullability:

```typescript
interface SurveyData {
  // Individual properties within objects can be null
  language?: {
    default?: string | null
    options?: string[] | null
  }
  presentation?: {
    format?: 'group' | 'question' | 'all' | null
    noAnswer?: boolean | null
    title?: boolean | null
    // ... all other properties nullable
  }
  participant?: {
    htmlEmail?: boolean | null
    thankYouEmail?: boolean | null
    tokenLength?: number | null
  }
  // ... all other inherited properties follow same pattern
}
```

## Calculation Methods

### Purpose

Survey provides calculation methods that resolve nullable properties into concrete values by applying global defaults where needed.

### Available Methods

- `getLanguage()` `{ default: string; options: string[] }`
- `getPresentation()` Full presentation object with all properties
- `getParticipant()` Full participant object with all properties
- `getData()` Full data collection settings
- `getAccess()` Full access control settings
- `getDataPolicy()` Full data policy settings
- `getLegalNotice()` Full legal notice settings
- `getSchedule()` Full publish schedule settings
- `getNotify()` Full notification settings

### Example Usage

```typescript
const survey = new Survey({
  _id: '1',
  projectId: '1',
  createdById: '1',
  name: 'Test Survey',
  title: { en: 'Test' },
  language: {
    default: 'es',
    options: null, // Will fall back to global default
  },
})

// Get calculated language with fallbacks applied
const language = survey.getLanguage()
// Returns: { default: 'es', options: ['en'] }  // options from global default

// Get calculated presentation (entire object was null)
const presentation = survey.getPresentation()
// Returns: { format: 'group', noAnswer: true, title: true, ... } // all from global defaults
```

## Global Defaults Management

### SurveySettingDefaults Singleton

The `SurveySettingDefaults` class manages global default values that are used as fallbacks for null properties.

```typescript
import { SurveySettingDefaults } from '../SurveySetting/SurveySettingDefaults'
import { SurveySetting } from '../SurveySetting'

// Get current global defaults
const currentDefaults = SurveySettingDefaults.getInstance()

// Set custom global defaults
const customDefaults = new SurveySetting({
  _id: 'custom-global',
  projectId: 'global',
  language: {
    default: 'fr',
    options: ['fr', 'en', 'es'],
  },
  presentation: {
    format: 'question',
    noAnswer: false,
    // ... other customizations
  },
})

SurveySettingDefaults.setGlobalDefaults(customDefaults)

// All new Survey instances will now use these defaults for null properties
```

### Built-in Defaults

When no custom defaults are set, the system uses built-in defaults that match standard survey configuration:

- Language: English default with English options
- Presentation: Group format with standard UI elements shown
- Access: Secure defaults (anonymous: false, open: false, etc.)
- Data Collection: Privacy-focused defaults (minimal data collection)

## Mixin Integration

### Seamless Compatibility

Existing mixin methods automatically work with the nullable properties system. They detect when calculation methods are available and use them for reading current values.

```typescript
// LanguageMethods mixin automatically uses getLanguage() when available
const survey = new Survey({/* ... */})

// These methods work seamlessly with nullable properties
const hasEnglish = survey.hasLanguageOption('en') // Uses getLanguage() internally
const updatedSurvey = survey.addLanguageOption('de') // Reads current via getLanguage()
```

### Mixin Method Behaviour

Mixin methods follow this pattern:

1. **Reading Values**: Use calculation methods (`getLanguage()`) when available, fall back to raw properties for SurveySetting instances
2. **Writing Values**: Always write to the actual properties (maintaining immutability)
3. **Chaining**: Full method chaining support preserved

## Implementation Details

### Survey Base Architecture

Survey Base no longer extends SurveySettingBase directly. Instead, it uses composition:

```typescript
export class Base {
  // Base properties
  _id: string
  projectId: string
  created: Date
  updated: Date

  // Survey-specific properties
  createdById: string
  name: string
  title: L10n
  // ...

  // Nullable SurveySetting properties
  language?: { default?: string | null; options?: string[] | null }
  presentation?: {/* all properties nullable */}
  // ...

  // Calculation methods
  getLanguage() {
    /* implementation */
  }
  getPresentation() {
    /* implementation */
  }
  // ...

  // Core mixin support methods
  update(data: Partial<any>): any
  setNestedProperty(/* ... */): any
  updateNestedProperty(/* ... */): any
  protected newInstance(changes?: Partial<Data>): any
}
```

### Type Safety

The system maintains full type safety:

- **Data Interface**: Defines nullable input types
- **Survey Interface**: Includes both nullable properties and calculation methods
- **Calculation Methods**: Return non-nullable, fully resolved objects
- **Mixin Compatibility**: Methods work with both Survey and SurveySetting instances

## Usage Patterns

### 1. Minimal Survey Creation

Create surveys that mostly use global defaults:

```typescript
const survey = new Survey({
  _id: '1',
  projectId: '1',
  createdById: '1',
  name: 'Quick Survey',
  title: { en: 'Quick Survey' },
  // All SurveySetting properties will use global defaults
})
```

### 2. Selective Customization

Override only specific properties:

```typescript
const survey = new Survey({
  _id: '1',
  projectId: '1',
  createdById: '1',
  name: 'Custom Survey',
  title: { en: 'Custom Survey' },
  language: {
    default: 'fr',
    options: ['fr', 'en'],
  },
  access: {
    anonymous: true,
    // All other access properties will use defaults
  },
})
```

### 3. Runtime Defaults Management

Configure global defaults for organizational standards:

```typescript
// Set up organizational defaults
const orgDefaults = new SurveySetting({
  _id: 'org-defaults',
  projectId: 'organization',
  language: {
    default: 'en',
    options: ['en', 'fr', 'es'],
  },
  presentation: {
    format: 'group',
    progressBar: true,
    questionCount: true,
  },
  access: {
    anonymous: false,
    captcha: true,
  },
})

SurveySettingDefaults.setGlobalDefaults(orgDefaults)

// All surveys created after this will use organizational defaults
```

## Testing

The system includes comprehensive tests in `NullableProperties.test.ts` covering:

- Default fallback behaviour
- Custom property values
- Partial object handling with nulls
- Mixin method compatibility
- Global defaults management
- Edge cases and type safety

This nullable properties system provides maximum flexibility while maintaining type safety and backward compatibility with existing Survey and SurveySetting functionality.
