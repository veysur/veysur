import {
  getDefaultAttributesForType,
  getDefaultAttributesForSubquestionType,
  transitionAttributes,
  getAttributeMeta,
  isAttributeValidForType,
} from './attributeHelpers'
import {
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_SURVEY_LANG_SELECT,
  QUESTION_TYPE_MATRIX_COMPOSITE,
  ATTRIBUTE_QUESTION_TYPE,
  ATTRIBUTE_QUESTION_REQUIRED,
  ATTRIBUTE_QUESTION_INPUT_SIZE,
  ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
  ATTRIBUTE_CHOICE_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
  ATTRIBUTE_MATRIX_ORIENTATION,
  ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
  MATRIX_ORIENTATION_SUBQUESTIONS_ROWS,
} from './attributeMeta'

describe('Attribute Helpers', () => {
  describe('getDefaultAttributesForType', () => {
    test('returns default attributes for text questions', () => {
      const defaults = getDefaultAttributesForType(QUESTION_TYPE_TEXT)

      // Should include universal attributes (stored in attributes object)
      expect(defaults).toHaveProperty(ATTRIBUTE_QUESTION_REQUIRED)

      // Should NOT include entity properties (type, code, condition)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_TYPE)

      // Should include text-specific attributes
      expect(defaults).toHaveProperty(ATTRIBUTE_QUESTION_INPUT_SIZE)
      expect(defaults).toHaveProperty(ATTRIBUTE_QUESTION_LENGTH_MIN_MAX)

      // Should not include number-specific attributes
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_MIN_MAX)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED)

      // Should not include choice-specific attributes
      expect(defaults).not.toHaveProperty(ATTRIBUTE_CHOICE_MIN_MAX)
    })

    test('returns default attributes for number questions', () => {
      const defaults = getDefaultAttributesForType(QUESTION_TYPE_NUMBER)

      // Should include universal attributes (stored in attributes object)
      expect(defaults).toHaveProperty(ATTRIBUTE_QUESTION_REQUIRED)

      // Should NOT include entity properties (type, code, condition)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_TYPE)

      // Should include number-specific attributes
      expect(defaults).toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_MIN_MAX)
      expect(defaults).toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED)

      // Should not include text-specific attributes
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_INPUT_SIZE)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_LENGTH_MIN_MAX)

      // Should not include choice-specific attributes
      expect(defaults).not.toHaveProperty(ATTRIBUTE_CHOICE_MIN_MAX)
    })

    test('returns default attributes for checkbox questions', () => {
      const defaults = getDefaultAttributesForType(QUESTION_TYPE_CHECKBOX)

      // Should include universal attributes (stored in attributes object)
      expect(defaults).toHaveProperty(ATTRIBUTE_QUESTION_REQUIRED)

      // Should NOT include entity properties (type, code, condition)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_TYPE)

      // Should include choice-specific attributes
      expect(defaults).toHaveProperty(ATTRIBUTE_CHOICE_MIN_MAX)

      // Should not include text-specific attributes
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_INPUT_SIZE)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_LENGTH_MIN_MAX)

      // Should not include number-specific attributes
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_MIN_MAX)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED)
    })

    test('returns default attributes for yes/no questions', () => {
      const defaults = getDefaultAttributesForType(QUESTION_TYPE_YES_NO)

      // Should include universal attributes (stored in attributes object)
      expect(defaults).toHaveProperty(ATTRIBUTE_QUESTION_REQUIRED)

      // Should NOT include entity properties (type, code, condition)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_TYPE)

      // Yes/No does not have choiceMinMax
      expect(defaults).not.toHaveProperty(ATTRIBUTE_CHOICE_MIN_MAX)
    })

    test('returns default attributes for survey language questions', () => {
      const defaults = getDefaultAttributesForType(
        QUESTION_TYPE_SURVEY_LANG_SELECT,
      )

      // Should include universal attributes (stored in attributes object)
      expect(defaults).toHaveProperty(ATTRIBUTE_QUESTION_REQUIRED)

      // Should NOT include entity properties (type, code, condition)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_TYPE)

      // Should not include type-specific attributes
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_INPUT_SIZE)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_MIN_MAX)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_CHOICE_MIN_MAX)
    })

    test('returns default attributes for matrix questions', () => {
      const defaults = getDefaultAttributesForType(
        QUESTION_TYPE_MATRIX_COMPOSITE,
      )

      // Should include universal attributes
      expect(defaults).toHaveProperty(ATTRIBUTE_QUESTION_REQUIRED)

      // Should NOT include entity properties
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_TYPE)

      // Should include matrix-specific attributes with correct default
      expect(defaults).toHaveProperty(ATTRIBUTE_MATRIX_ORIENTATION)
      expect(defaults[ATTRIBUTE_MATRIX_ORIENTATION]).toBe(
        MATRIX_ORIENTATION_SUBQUESTIONS_ROWS,
      )

      // Should not include other type-specific attributes
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_INPUT_SIZE)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_LENGTH_MIN_MAX)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_CHOICE_MIN_MAX)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_MIN_MAX)
      expect(defaults).not.toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED)
    })

    test('uses text as default when no type is provided', () => {
      const defaults = getDefaultAttributesForType()

      // Should match text question defaults
      const textDefaults = getDefaultAttributesForType(QUESTION_TYPE_TEXT)
      expect(defaults).toEqual(textDefaults)
    })

    test('returns correct initial values', () => {
      const defaults = getDefaultAttributesForType(QUESTION_TYPE_TEXT)

      // Entity properties (type, code, condition) are NOT in attributes
      expect(defaults[ATTRIBUTE_QUESTION_TYPE]).toBeUndefined()

      // Actual attributes have correct initial values
      expect(defaults[ATTRIBUTE_QUESTION_REQUIRED]).toBe(true)
      expect(defaults[ATTRIBUTE_QUESTION_INPUT_SIZE]).toBe(
        ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
      )
      expect(defaults[ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]).toEqual({
        min: 0,
        max: 0,
      })
    })

    test('returns new object each time (not cached)', () => {
      const defaults1 = getDefaultAttributesForType(QUESTION_TYPE_TEXT)
      const defaults2 = getDefaultAttributesForType(QUESTION_TYPE_TEXT)

      expect(defaults1).not.toBe(defaults2)
      expect(defaults1).toEqual(defaults2)
    })
  })

  describe('transitionAttributes', () => {
    test('transitions from text to number, preserving common attributes', () => {
      const textAttributes = {
        [ATTRIBUTE_QUESTION_REQUIRED]: false, // Custom value
        [ATTRIBUTE_QUESTION_INPUT_SIZE]: 'large',
        [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 5, max: 100 },
      }

      const result = transitionAttributes(
        textAttributes,
        QUESTION_TYPE_TEXT,
        QUESTION_TYPE_NUMBER,
      )

      // Should preserve common attributes with their custom values
      expect(result[ATTRIBUTE_QUESTION_REQUIRED]).toBe(false)

      // Should remove text-specific attributes
      expect(result).not.toHaveProperty(ATTRIBUTE_QUESTION_INPUT_SIZE)
      expect(result).not.toHaveProperty(ATTRIBUTE_QUESTION_LENGTH_MIN_MAX)

      // Should add number-specific attributes with defaults
      expect(result).toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_MIN_MAX)
      expect(result).toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED)
      expect(result[ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]).toBe(false)
    })

    test('transitions from number to text, preserving common attributes', () => {
      const numberAttributes = {
        [ATTRIBUTE_QUESTION_REQUIRED]: false, // Custom value
        [ATTRIBUTE_QUESTION_NUMBER_MIN_MAX]: { min: 1, max: 100 },
        [ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED]: true,
      }

      const result = transitionAttributes(
        numberAttributes,
        QUESTION_TYPE_NUMBER,
        QUESTION_TYPE_TEXT,
      )

      // Should preserve common attributes with their custom values
      expect(result[ATTRIBUTE_QUESTION_REQUIRED]).toBe(false)

      // Should remove number-specific attributes
      expect(result).not.toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_MIN_MAX)
      expect(result).not.toHaveProperty(ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED)

      // Should add text-specific attributes with defaults
      expect(result).toHaveProperty(ATTRIBUTE_QUESTION_INPUT_SIZE)
      expect(result).toHaveProperty(ATTRIBUTE_QUESTION_LENGTH_MIN_MAX)
      expect(result[ATTRIBUTE_QUESTION_INPUT_SIZE]).toBe(
        ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
      )
    })

    test('transitions from text to checkbox, preserving common attributes', () => {
      const textAttributes = {
        [ATTRIBUTE_QUESTION_REQUIRED]: false, // Custom value
        [ATTRIBUTE_QUESTION_INPUT_SIZE]: 'large',
        [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 5, max: 100 },
      }

      const result = transitionAttributes(
        textAttributes,
        QUESTION_TYPE_TEXT,
        QUESTION_TYPE_CHECKBOX,
      )

      // Should preserve common attributes with their custom values
      expect(result[ATTRIBUTE_QUESTION_REQUIRED]).toBe(false)

      // Should remove text-specific attributes
      expect(result).not.toHaveProperty(ATTRIBUTE_QUESTION_INPUT_SIZE)
      expect(result).not.toHaveProperty(ATTRIBUTE_QUESTION_LENGTH_MIN_MAX)

      // Should add checkbox-specific attributes with defaults
      expect(result).toHaveProperty(ATTRIBUTE_CHOICE_MIN_MAX)
    })

    test('handles empty current attributes', () => {
      const result = transitionAttributes(
        {},
        QUESTION_TYPE_TEXT,
        QUESTION_TYPE_NUMBER,
      )

      // Should return all default attributes for number type
      const numberDefaults = getDefaultAttributesForType(QUESTION_TYPE_NUMBER)
      expect(result).toEqual(numberDefaults)
    })

    test('handles undefined current attributes', () => {
      const result = transitionAttributes(
        undefined,
        QUESTION_TYPE_TEXT,
        QUESTION_TYPE_NUMBER,
      )

      // Should return all default attributes for number type
      const numberDefaults = getDefaultAttributesForType(QUESTION_TYPE_NUMBER)
      expect(result).toEqual(numberDefaults)
    })

    test('preserves unknown attributes if they are valid for the new type', () => {
      const textAttributes = {
        [ATTRIBUTE_QUESTION_REQUIRED]: false,
        unknownAttribute: 'some value',
      }

      const result = transitionAttributes(
        textAttributes,
        QUESTION_TYPE_TEXT,
        QUESTION_TYPE_NUMBER,
      )

      // Unknown attributes should not be preserved (only valid attributes)
      expect(result).not.toHaveProperty('unknownAttribute')
    })

    test('transitions to same type should preserve all custom values', () => {
      const textAttributes = {
        [ATTRIBUTE_QUESTION_REQUIRED]: false, // Custom value
        [ATTRIBUTE_QUESTION_INPUT_SIZE]: 'large', // Custom value
        [ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]: { min: 5, max: 100 }, // Custom value
      }

      const result = transitionAttributes(
        textAttributes,
        QUESTION_TYPE_TEXT,
        QUESTION_TYPE_TEXT,
      )

      // All attributes should be preserved with custom values
      expect(result[ATTRIBUTE_QUESTION_REQUIRED]).toBe(false)
      expect(result[ATTRIBUTE_QUESTION_INPUT_SIZE]).toBe('large')
      expect(result[ATTRIBUTE_QUESTION_LENGTH_MIN_MAX]).toEqual({
        min: 5,
        max: 100,
      })
    })

    test('returns a new object (does not mutate input)', () => {
      const textAttributes = {
        [ATTRIBUTE_QUESTION_REQUIRED]: false,
      }

      const result = transitionAttributes(
        textAttributes,
        QUESTION_TYPE_TEXT,
        QUESTION_TYPE_NUMBER,
      )

      expect(result).not.toBe(textAttributes)
      // Original should be unchanged
      expect(textAttributes[ATTRIBUTE_QUESTION_REQUIRED]).toBe(false)
    })
  })

  describe('getAttributeMeta', () => {
    test('returns metadata for valid attribute ID', () => {
      const meta = getAttributeMeta(ATTRIBUTE_QUESTION_REQUIRED)

      expect(meta).toBeDefined()
      expect(meta?.id).toBe(ATTRIBUTE_QUESTION_REQUIRED)
      expect(meta?.initialValue).toBe(true)
      expect(meta?.typesLimit).toEqual([])
    })

    test('returns metadata for text-specific attribute', () => {
      const meta = getAttributeMeta(ATTRIBUTE_QUESTION_INPUT_SIZE)

      expect(meta).toBeDefined()
      expect(meta?.id).toBe(ATTRIBUTE_QUESTION_INPUT_SIZE)
      expect(meta?.initialValue).toBe(ATTRIBUTE_TEXT_INPUT_SIZE_SMALL)
      expect(meta?.typesLimit).toEqual([QUESTION_TYPE_TEXT])
    })

    test('returns metadata for number-specific attribute', () => {
      const meta = getAttributeMeta(ATTRIBUTE_QUESTION_NUMBER_MIN_MAX)

      expect(meta).toBeDefined()
      expect(meta?.id).toBe(ATTRIBUTE_QUESTION_NUMBER_MIN_MAX)
      expect(meta?.initialValue).toEqual({ min: 0, max: 0 })
      expect(meta?.typesLimit).toEqual([QUESTION_TYPE_NUMBER])
    })

    test('returns metadata for choiceMinMax attribute', () => {
      const meta = getAttributeMeta(ATTRIBUTE_CHOICE_MIN_MAX)

      expect(meta).toBeDefined()
      expect(meta?.id).toBe(ATTRIBUTE_CHOICE_MIN_MAX)
      expect(meta?.typesLimit).toContain(QUESTION_TYPE_CHECKBOX)
      expect(meta?.typesLimit).toContain(QUESTION_TYPE_DROPDOWN)
    })

    test('returns undefined for non-existent attribute ID', () => {
      const meta = getAttributeMeta('nonExistentAttribute')

      expect(meta).toBeUndefined()
    })

    test('returns undefined for empty string', () => {
      const meta = getAttributeMeta('')

      expect(meta).toBeUndefined()
    })
  })

  describe('isAttributeValidForType', () => {
    test('returns true for universal attributes on any type', () => {
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_REQUIRED,
          QUESTION_TYPE_TEXT,
        ),
      ).toBe(true)
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_REQUIRED,
          QUESTION_TYPE_NUMBER,
        ),
      ).toBe(true)
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_REQUIRED,
          QUESTION_TYPE_CHECKBOX,
        ),
      ).toBe(true)

      expect(
        isAttributeValidForType(ATTRIBUTE_QUESTION_TYPE, QUESTION_TYPE_TEXT),
      ).toBe(true)
      expect(
        isAttributeValidForType(ATTRIBUTE_QUESTION_TYPE, QUESTION_TYPE_NUMBER),
      ).toBe(true)
    })

    test('returns true for text-specific attributes on text questions', () => {
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_INPUT_SIZE,
          QUESTION_TYPE_TEXT,
        ),
      ).toBe(true)
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
          QUESTION_TYPE_TEXT,
        ),
      ).toBe(true)
    })

    test('returns false for text-specific attributes on non-text questions', () => {
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_INPUT_SIZE,
          QUESTION_TYPE_NUMBER,
        ),
      ).toBe(false)
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_INPUT_SIZE,
          QUESTION_TYPE_CHECKBOX,
        ),
      ).toBe(false)
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
          QUESTION_TYPE_NUMBER,
        ),
      ).toBe(false)
    })

    test('returns true for number-specific attributes on number questions', () => {
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
          QUESTION_TYPE_NUMBER,
        ),
      ).toBe(true)
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
          QUESTION_TYPE_NUMBER,
        ),
      ).toBe(true)
    })

    test('returns false for number-specific attributes on non-number questions', () => {
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
          QUESTION_TYPE_TEXT,
        ),
      ).toBe(false)
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
          QUESTION_TYPE_CHECKBOX,
        ),
      ).toBe(false)
      expect(
        isAttributeValidForType(
          ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
          QUESTION_TYPE_TEXT,
        ),
      ).toBe(false)
    })

    test('returns true for choiceMinMax on answer-option question types', () => {
      expect(
        isAttributeValidForType(
          ATTRIBUTE_CHOICE_MIN_MAX,
          QUESTION_TYPE_CHECKBOX,
        ),
      ).toBe(true)
      expect(
        isAttributeValidForType(
          ATTRIBUTE_CHOICE_MIN_MAX,
          QUESTION_TYPE_DROPDOWN,
        ),
      ).toBe(true)
      expect(
        isAttributeValidForType(ATTRIBUTE_CHOICE_MIN_MAX, QUESTION_TYPE_BUTTON),
      ).toBe(true)
      expect(
        isAttributeValidForType(
          ATTRIBUTE_CHOICE_MIN_MAX,
          QUESTION_TYPE_IMAGE_SELECT,
        ),
      ).toBe(true)
    })

    test('returns false for choiceMinMax on non-answer-option question types', () => {
      expect(
        isAttributeValidForType(ATTRIBUTE_CHOICE_MIN_MAX, QUESTION_TYPE_TEXT),
      ).toBe(false)
      expect(
        isAttributeValidForType(ATTRIBUTE_CHOICE_MIN_MAX, QUESTION_TYPE_NUMBER),
      ).toBe(false)
      expect(
        isAttributeValidForType(ATTRIBUTE_CHOICE_MIN_MAX, QUESTION_TYPE_YES_NO),
      ).toBe(false)
    })

    test('returns false for non-existent attribute IDs', () => {
      expect(
        isAttributeValidForType('nonExistentAttribute', QUESTION_TYPE_TEXT),
      ).toBe(false)
      expect(
        isAttributeValidForType('nonExistentAttribute', QUESTION_TYPE_NUMBER),
      ).toBe(false)
    })

    test('returns false for empty attribute ID', () => {
      expect(isAttributeValidForType('', QUESTION_TYPE_TEXT)).toBe(false)
    })
  })

  describe('getDefaultAttributesForSubquestionType', () => {
    test('required defaults to false for subquestions', () => {
      const defaults =
        getDefaultAttributesForSubquestionType(QUESTION_TYPE_TEXT)
      expect(defaults[ATTRIBUTE_QUESTION_REQUIRED]).toBe(false)
    })

    test('question-level required still defaults to true', () => {
      const defaults = getDefaultAttributesForType(QUESTION_TYPE_TEXT)
      expect(defaults[ATTRIBUTE_QUESTION_REQUIRED]).toBe(true)
    })
  })
})
