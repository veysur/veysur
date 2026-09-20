# Survey Component

## Overview

The Survey component (`Survey.tsx`) is the standalone survey rendering component used by end users to complete surveys. It is designed to be completely independent of any editing functionality.

## Refactored Architecture (2024)

The Survey component has been refactored into multiple focused files for better maintainability:

### Core Files

- **`Survey.tsx`** - Main orchestrating component (~160 lines, down from 480+)
- **`SurveyTypes.ts`** - TypeScript type definitions and interfaces
- **`debugUtils.ts`** - Centralized debug logging with toggle control

### Hooks (`hook/` directory)

- **`useSurveyState.ts`** - State management (language, countdown, answers)
- **`useSurveyNavigation.ts`** - Navigation logic and state
- **`useSurveyValidation.ts`** - Validation logic using mzen-schema

### Utilities

- **`surveyProgressUtils.ts`** - Progress calculation utilities

### Benefits of Refactoring

- **Separation of Concerns**: Each file has single responsibility
- **Reusability**: Hooks can be used independently in other components
- **Testability**: Individual pieces can be tested in isolation
- **Maintainability**: Easier to locate and modify specific functionality
- **Type Safety**: Centralized type definitions

## Architecture Principles

### Independence from Editing

- **No Editor Dependencies**: The Survey component must NOT import or use any editing-related functionality like `useSurveyEditorStore`
- **Separate State Management**: Uses its own internal state for language selection, navigation, and UI state
- **Clear Separation**: Used by `PageSurveyEditPreview` during editing preview, but maintains independence

### State Management

The component manages its own state for:

- `langEditing`: Language selection (defaults to `survey?.language?.default || 'en'`)
- `showWelcome`: Welcome screen visibility
- `currentGroupIndex`/`currentQuestionIndex`: Navigation state
- `countdown`: Navigation delay timer
- `answers`: Survey answers storage keyed by `question.code`

### Format Support

Supports three presentation formats:

- **`all`**: All questions on one page (`SurveyFormatAll`)
- **`group`**: One group per page (`SurveyFormatGroup`)
- **`question`**: One question per page (`SurveyFormatQuestion`)

### Key Features

- **Multi-language Support**: Independent language selector and state
- **Welcome Screen**: Configurable welcome message, privacy policy, legal notice
- **Progress Tracking**: Format-aware progress calculation
- **Navigation**: Back/forward navigation with countdown delays
- **Responsive Layout**: Bootstrap-based responsive design
- **Answer Storage**: Captures user responses keyed by `question.code`

## Component Structure

### Props

```typescript
type Props = {
  useSurveyEditorState: ReturnType<typeof useSurveyEditor>
}
```

### Sub-components

- `SurveyLanguageSelector`: Language selection dropdown
- `SurveyProgressBar`: Progress indication
- `SurveyNavigation`: Navigation controls
- `SurveyWelcome`: Welcome screen
- `SurveyFormatAll/Group/Question`: Content rendering by format

## Usage Context

- **End User Surveys**: Primary component for survey completion
- **Preview Mode**: Used in `PageSurveyEditPreview` for editor preview
- **Standalone**: Can operate independently without editor context

## Answer Storage

The Survey component implements a complete answer storage system:

### Answer Structure

```typescript
type SurveyAnswers = {
  [questionCode: string]: any
}
```

### Answer Types by Question Type

- **Text Questions**: String values

  ```typescript
  { "Q1": "User's text response" }
  ```

- **Number Questions**: Numeric values

  ```typescript
  { "Q2": 42 }
  ```

- **Multiple Choice Questions**: Arrays of selected `SurveyAnswerOption.code` values

  ```typescript
  // Checkbox (multiple selections)
  { "Q3": ["optionA", "optionC"] }

  // Radio/Dropdown (single selection)
  { "Q4": ["optionB"] }
  ```

### Answer Handling

- **Storage**: All answers stored in component state keyed by `question.code`
- **Updates**: Real-time answer changes via `handleAnswerChange(questionCode, value)`
- **Submission**: Complete answer object logged on survey submit
- **Debugging**: Controllable debug logging via `debugUtils.ts` (set `DEBUG = true` to enable)

### Question Component Interface

All question components implement `QuestionTypeProps`:

```typescript
type QuestionTypeProps = {
  question: SurveyQuestion
  value?: any // Current answer value
  onChange?: (value: any) => void // Answer change callback
}
```

## Question Components

### Text & Number Questions

- **QuestionTypeText**: Controlled text input/textarea with length validation
- **QuestionTypeNumber**: Controlled number input with min/max validation

### Multiple Choice Questions

- **MultipleChoiceCheckbox**: Checkbox/radio inputs for multiple/single selection
- **MultipleChoiceDropdown**: Native select for single selection; popover + checkbox list for multiple selection
- **Independence**: No longer depend on `useSurveyEditorStore` for language

All multiple choice components store arrays of `SurveyAnswerOption.code` values regardless of selection type.

## Validation System

The Survey component uses **mzen-schema** (exported as `Schema` from veysur-common) for comprehensive validation:

### Schema Integration

```typescript
import { Schema } from 'veysur-common'

// Type-aware validation based on question structure
const getValidationType = (question: any) => {
  if (question.type === 'multipleChoice') {
    return Array // Arrays of selected option codes
  } else if (question.subquestions && question.subquestions.length > 0) {
    return Object // Nested question data
  } else if (question.type === 'number') {
    return Number
  } else {
    return String // Text and other types
  }
}

const createValidationSchema = () => {
  const schemaFields: { [key: string]: any } = {}

  allQuestions.forEach(({ question }) => {
    const schemaField: any = {
      $type: getValidationType(question),
      $label: question.text.getLang(langEditing) || question.code,
    }

    if (question.attributes?.required) {
      schemaField.$validate = {
        required: true,
        notEmpty: true,
      }
    }

    schemaFields[question.code] = schemaField
  })

  return new Schema(schemaFields)
}
```

### Validation Types

```typescript
type ValidationErrors = {
  [questionCode: string]: string[] | undefined
}
```

### Validation Behaviour

- **Real-time Validation**: Validates individual questions as users type/select
- **Navigation Validation**: Validates required questions before allowing navigation to next page/question
- **Submit-time Validation**: Validates entire answer set before submission
- **Required Field Validation**: Uses mzen-schema's `notEmpty` validator
- **Type-Aware Validation**:
  - **Arrays** for multiple choice questions (selected option codes)
  - **Objects** for questions with subquestions (nested data)
  - **Numbers** for numeric input questions
  - **Strings** for text and other question types
- **Error Display**: Shows validation messages below each question using Bootstrap styling
- **Error Format**: Arrays of error strings joined with commas for display
- **Performance Optimization**: Synchronous navigation when no required fields present, async only when validation needed

### Visual Indicators

- **Required Questions**: Asterisk (\*) shown after question text
- **Validation Errors**: Red error text below question components
- **Async Validation**: All validation functions are async to support Schema's validation API

## Debug System

Centralized debug logging system for development and troubleshooting:

### Debug Configuration

```typescript
// debugUtils.ts
const DEBUG = false // Set to true to enable debug output

export const debug = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args)
  }
}
```

### Debug Output

When `DEBUG = true`, the system logs:

- **Answer Changes**: `"Answer changed: Q1, user input"`
- **Required Field Checks**: Details about which questions are required in current view
- **Navigation Validation**: Complete validation results including schema fields and errors
- **Validation Failures**: When navigation is blocked due to validation errors
- **Survey Submission**: Final answer data on successful submit

### Usage

- **Development**: Enable debug output by setting `DEBUG = true` in `debugUtils.ts`
- **Production**: Keep `DEBUG = false` for clean console output
- **Testing**: Debug function works in both enabled/disabled states

## Testing

Comprehensive test coverage (50+ tests) including:

- Format rendering behaviour
- Navigation functionality
- Language selection
- Progress tracking
- Welcome screen logic
- Countdown timers
- Answer storage system integration
- Type-aware validation system
- Debug functionality (enabled/disabled states)
