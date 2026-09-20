# Constructor Organization Pattern

## Overview

Model constructors in `src/model/constructor/` follow two distinct patterns based on complexity and size requirements.

## Simple Constructor Pattern

Most constructors use the traditional TypeScript class pattern for straightforward models:

```typescript
export class User {
  _id: string
  nameFirst: string
  // ... properties

  constructor(data) {
    Object.assign(this, data)
  }

  // ... methods
}
```

**Use when:**

- Constructor is under ~500 lines
- Limited behavioural complexity
- Straightforward property/method structure

**Examples:** `User.ts`, `Project.ts`, `UserClient.ts`, `SurveyResponse.ts`

## Complex Constructor Pattern (Mixin Composition)

For large, complex constructors (~500+ lines), we use a functional mixin composition pattern. The `Survey` constructor exemplifies this approach.

The same mixin mechanism is also sanctioned at the **leaf-entity** scale for
behaviour genuinely shared by several small classes: `Survey/mixin/entityConditionMethods.ts`
and `entityAttributeMethods.ts` are applied to `SurveyElementBase`
(question + content), `SurveySection` and `SurveySubquestion`, all composed over
the `ImmutableEntity` base whose `withChanges()` primitive replaces per-class
`new Self({ ...this, patch })` boilerplate. Do not reach for a mixin for a
one- or two-class overlap — a concrete method or a free function is clearer there.

### Required Components

#### 1. Base Class (`Survey/SurveyBase.ts`)

- Contains core data structure interface and properties
- Implements `newInstance()` method for immutable operations
- Defines the foundational data schema

#### 2. Mixins (`Survey/mixin/*.ts`)

Each mixin is a function that takes a base class and returns an extended class:

```typescript
export function SurveySettingCoreMethods<T extends new (...args: any[]) => any>(
  Base: T,
) {
  return class extends Base {
    applySortOrder(): any {
      // Implementation that returns new instance
      return this.newInstance(changes)
    }
    // ... other methods
  }
}
```

**Current Survey mixins:**

- `SurveyCoreMethods` - Basic operations (update, sort, `updateElementCollection`)
- `SectionMethods` - Survey section management
- `QuestionMethods` - Question management
- `ContentMethods` - Content-element management
- `SubquestionMethods` - Subquestion operations
- `AnswerOptionMethods` - Answer option handling
- `LanguageMethods` - Internationalization
- `PresentationMethods` - Display settings
- `ParticipantMethods` - Participant configuration
- `DataMethods` - Data tracking settings
- `AccessMethods` - Access control
- `DataPolicyMethods` - Privacy settings
- `LegalNoticeMethods` - Legal notices
- `ScheduleMethods` - Publish schedule controls
- `NotifyMethods` - Notification settings
- `WelcomeThankYouSectionMethods` - Welcome / thank-you section handling

(See `Survey.ts` for the authoritative, ordered composition list.)

#### 3. Interface (`Survey/SurveyInterface.ts`)

Comprehensive TypeScript interface that includes:

- All properties from Base class
- All methods from every mixin
- Proper return types for IntelliSense

```typescript
export interface Interface {
  // Base properties
  _id: string
  name: string
  // ...

  // Methods from all mixins
  applySortOrder(): Interface
  addSection(init?: Partial<SurveySectionData>): Interface
  // ... all mixin methods
}
```

#### 4. Main Constructor (`Survey.ts`)

Composes all mixins using functional composition:

```typescript
const SurveyImpl = ContentFormatMethods(
  AccessMethods(
    WelcomeThankYouSectionMethods(
      // ... nested mixin composition
      SurveyCoreMethods(GetterMethods(SettingSurveyCoreMethods(SurveyBase))),
    ),
  ),
)

export class Survey extends SurveyImpl implements SurveyInterface {}
```

### Key Patterns

#### Immutability

All operations return new instances rather than mutating existing ones:

- Use `newInstance(changes)` method from Base
- Smart object reuse - unchanged collections/objects are reused
- Conditional instance creation - returns same instance if no changes

#### Mixin Composition Order

Mixins are composed from inside-out, with Base at the core and specialized behaviour layered on top.

#### Testing Strategy

- Each mixin has its own test file (`*.test.ts`)
- Base class has comprehensive tests
- Integration tests for full composed class

## When to Split a Constructor

Consider using the mixin pattern when:

1. **Size threshold** - Constructor exceeds ~500 lines
2. **Distinct behavioural domains** - Clear separation of concerns (groups, questions, settings, etc.)
3. **Immutability requirements** - Need sophisticated state management
4. **Team development** - Multiple developers working on different aspects

## Implementation Steps

1. **Create directory structure:**

   ```
   ModelName/
   ├── ModelNameBase.ts      # Core data structure
   ├── ModelNameInterface.ts # Complete interface
   ├── index.ts              # Re-exports
   └── mixin/
       ├── ModelNameCoreMethods.ts
       ├── FeatureMethods.ts
       └── ...
   ```

2. **Define Base class** with data structure and `newInstance()` method

3. **Create focused mixins** - each handling one behavioural domain

4. **Define comprehensive Interface** - include all properties and methods

5. **Compose main constructor** - layer mixins and implement interface

6. **Add tests** - for each component and integration

## Benefits

- **Modularity** - Logical separation of behavioural concerns
- **Maintainability** - Easier to modify specific functionality
- **TypeScript Support** - Complete IntelliSense across all mixed methods
- **Immutability** - Built-in support for immutable operations
- **Testability** - Each mixin can be unit tested independently
- **Reusability** - Mixins can potentially be reused across similar constructors
