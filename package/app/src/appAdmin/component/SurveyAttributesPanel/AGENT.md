# SurveyAttributesPanel Component

The SurveyAttributesPanel is a dynamic attributes editing system that allows users to configure properties of different survey entities (surveys, groups, questions) through a consistent interface.

## Architecture Overview

### Core Components

- **SurveyAttributesPanel** - Main container that manages attribute sets for focused entities
- **AttributeSet** - Groups related attributes under collapsible sections
- **AttributeCard** - Individual attribute editor with validation and custom components
- **Component Library** - Specialized input components (TextInput, YesNo, Dropdown, etc.)

### Key Files

- `attributesConfig.ts` - Central configuration defining all attributes
- `constant.ts` - Attribute ID constants and naming conventions
- `hook/useAttributeSets.ts` - Hook for filtering attributes by entity type and question type

## Attribute Configuration System

### AttributeConfig Structure

Each attribute is defined with:

```typescript
{
  id: string                    // Unique identifier
  entityTypes: SurveyEntityType[]  // Which entity types show this attribute
  name: string                  // Display name in UI
  description: string           // Tooltip description
  component: React.FC          // Input component to render
  initialValue: any            // Default value
  typesLimit: QuestionType[]   // Question types to show for (empty = all)
  options?: object             // Dropdown options
  schemaSpec?: SchemaSpec      // Validation rules
  getValue: (entity, langEditing?) => any  // Custom value extraction logic
  onChange?: (value, operations, surveyFocus, langEditing) => void  // Change handler
}
```

### getAttribute Functions

All attributes now use `getValue` functions for consistent data access:

- **Simple path access**: Uses `ObjectPathAccessor.getPath()`
- **Attribute object access**: Directly accesses `entity.attributes[key]`
- **L10n support**: Custom logic like `entity.title.getLang(langEditing)` for internationalized content

## Entity Types and Attributes

### Survey Title Entity (`SURVEY_ENTITY_TYPE_TITLE`)

- **Show title** (`ATTRIBUTE_SURVEY_PRESENTATION_TITLE`) - YesNo toggle for title visibility
- **Title Text** (`ATTRIBUTE_SURVEY_TITLE`) - TextInput for editing survey title with L10n support

### Welcome Message Entity (`SURVEY_ENTITY_TYPE_WELCOME`)

- **Show welcome message** (`ATTRIBUTE_SURVEY_PRESENTATION_WELCOME_MESSAGE`) - YesNo toggle

### Element Entity (`SURVEY_ENTITY_TYPE_ELEMENT`)

- **Code** - Unique identifier with regex validation
- **Type** - Dropdown (Text, Number, Multiple Choice)
- **Input Type** - For multiple choice questions (Checkbox, Dropdown, Image)
- **Required** - YesNo toggle for mandatory answers
- **Input Size** - Text input size (Small, Medium, Large)
- **Length** - Min/max character limits for text questions
- **Choices** - Min/max selection limits for multiple choice
- **Range** - Min/max numeric limits for number questions
- **Negative** - Allow negative numbers toggle

### Section Entity (`SURVEY_ENTITY_TYPE_SECTION`)

- **Code** - Unique identifier with regex validation

## Key Features

### Language Support

- `langEditing` parameter flows from store through all components
- Survey title attribute uses custom `getValue` to access L10n object safely
- `onChange` handlers receive `langEditing` for proper language-specific updates

### Dynamic Filtering

- Attributes filtered by `entityTypes` to show only relevant ones
- Question attributes further filtered by `typesLimit` based on question type
- Empty `typesLimit` means attribute applies to all question types

### Validation System

- Built-in validation using `SchemaSpec` with real-time feedback
- Custom validation rules (required, regex patterns, type checking)
- Visual feedback with Bootstrap invalid states

### Operations Integration

- Uses operations from `useSurveyEditorStore` for all modifications
- Immutable update patterns - operations return new survey instances
- Patch system buffers changes for efficient API updates

## Constants and Naming

### Attribute IDs

- Survey presentation: `ATTRIBUTE_SURVEY_PRESENTATION_*`
- Survey content: `ATTRIBUTE_SURVEY_*`
- Question attributes: `ATTRIBUTE_QUESTION_*`
- Entity properties: `ATTRIBUTE_ENTITY_*`

### Path Patterns

- Presentation settings: `presentation.{setting}`
- Question attributes: `attributes.{attribute}` (accessed via `entity.attributes`)
- Direct properties: `{property}` (like `code`, `type`)

## Development Guidelines

### Adding New Attributes

1. Add constant to `constant.ts`
2. Add to appropriate attribute set in `attributesConfig.ts`
3. Define `AttributeConfig` with proper `getValue` function
4. Implement `onChange` handler using operations
5. Choose appropriate input component

### L10n Attributes

For internationalized content:

- Implement custom `getValue` function accessing L10n methods
- Use `langEditing` parameter in both `getValue` and `onChange`
- Handle safe access patterns for optional L10n objects

### Custom Components

Create specialized input components in `component/` directory:

- Follow `AttributeConfig['component']` interface
- Handle validation display with `isValid` and `errors` props
- Use Bootstrap form components for consistency

## Best Practices

1. **Always use `getValue` functions** - Don't rely on path-only access
2. **Handle L10n safely** - Check for object existence and method availability
3. **Use operations for all changes** - Never mutate survey objects directly
4. **Validate input thoroughly** - Use `SchemaSpec` for consistent validation
5. **Keep attributes focused** - Each attribute should control one specific property
6. **Document complex logic** - Especially for custom `getValue` implementations
