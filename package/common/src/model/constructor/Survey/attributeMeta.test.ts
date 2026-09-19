import {
  attributesMetadata,
  AttributeMeta,
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
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
  ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM,
  ATTRIBUTE_TEXT_INPUT_SIZE_LARGE,
  MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS,
  MATRIX_ORIENTATION_SUBQUESTIONS_ROWS,
} from './attributeMeta'
import { MATRIX_QUESTION_TYPES } from './Matrix'
import Schema from 'mzen-schema'

describe('Attribute Metadata', () => {
  describe('Constants', () => {
    describe('Question Types', () => {
      test('exports expected question type constants', () => {
        expect(QUESTION_TYPE_TEXT).toBe('text')
        expect(QUESTION_TYPE_NUMBER).toBe('number')
        expect(QUESTION_TYPE_CHECKBOX).toBe('checkbox')
        expect(QUESTION_TYPE_DROPDOWN).toBe('dropdown')
        expect(QUESTION_TYPE_BUTTON).toBe('button')
        expect(QUESTION_TYPE_IMAGE_SELECT).toBe('imageSelect')
        expect(QUESTION_TYPE_YES_NO).toBe('yesNo')
        expect(QUESTION_TYPE_STAR_RATING).toBe('starRating')
        expect(QUESTION_TYPE_POINT_5).toBe('point5')
        expect(QUESTION_TYPE_POINT_10).toBe('point10')
        expect(QUESTION_TYPE_SURVEY_LANG_SELECT).toBe('surveyLangSelect')
        expect(QUESTION_TYPE_MATRIX_COMPOSITE).toBe('matrixComposite')
      })
    })

    describe('Attribute IDs', () => {
      test('exports expected attribute ID constants', () => {
        expect(ATTRIBUTE_QUESTION_TYPE).toBe('type')
        expect(ATTRIBUTE_QUESTION_REQUIRED).toBe('required')
        expect(ATTRIBUTE_QUESTION_INPUT_SIZE).toBe('inputSize')
        expect(ATTRIBUTE_QUESTION_LENGTH_MIN_MAX).toBe('lengthMinMax')
        expect(ATTRIBUTE_CHOICE_MIN_MAX).toBe('choiceMinMax')
        expect(ATTRIBUTE_QUESTION_NUMBER_MIN_MAX).toBe('numberMinMax')
        expect(ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED).toBe('numberNegAllowed')
        expect(ATTRIBUTE_MATRIX_ORIENTATION).toBe('matrixOrientation')
      })
    })

    describe('Matrix Orientation Constants', () => {
      test('exports expected matrix orientation constants', () => {
        expect(MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS).toBe('a')
        expect(MATRIX_ORIENTATION_SUBQUESTIONS_ROWS).toBe('b')
      })
    })

    describe('Input Size Constants', () => {
      test('exports expected input size constants', () => {
        expect(ATTRIBUTE_TEXT_INPUT_SIZE_SMALL).toBe('small')
        expect(ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM).toBe('medium')
        expect(ATTRIBUTE_TEXT_INPUT_SIZE_LARGE).toBe('large')
      })
    })
  })

  describe('attributesMetadata', () => {
    test('is an array of AttributeMeta objects', () => {
      expect(Array.isArray(attributesMetadata)).toBe(true)
      expect(attributesMetadata.length).toBeGreaterThan(0)

      attributesMetadata.forEach((meta) => {
        expect(meta).toHaveProperty('id')
        expect(meta).toHaveProperty('initialValue')
        expect(meta).toHaveProperty('typesLimit')
        expect(typeof meta.id).toBe('string')
        expect(Array.isArray(meta.typesLimit)).toBe(true)
      })
    })

    test('contains all expected attributes', () => {
      const attributeIds = attributesMetadata.map((meta) => meta.id)

      expect(attributeIds).toContain(ATTRIBUTE_QUESTION_TYPE)
      expect(attributeIds).toContain(ATTRIBUTE_QUESTION_REQUIRED)
      expect(attributeIds).toContain(ATTRIBUTE_QUESTION_INPUT_SIZE)
      expect(attributeIds).toContain(ATTRIBUTE_QUESTION_LENGTH_MIN_MAX)
      expect(attributeIds).toContain(ATTRIBUTE_CHOICE_MIN_MAX)
      expect(attributeIds).toContain(ATTRIBUTE_QUESTION_NUMBER_MIN_MAX)
      expect(attributeIds).toContain(ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED)
    })

    test('has no duplicate attribute IDs', () => {
      const attributeIds = attributesMetadata.map((meta) => meta.id)
      const uniqueIds = new Set(attributeIds)

      expect(attributeIds.length).toBe(uniqueIds.size)
    })

    describe('Question Type Attribute', () => {
      let typeAttr: AttributeMeta | undefined

      beforeEach(() => {
        typeAttr = attributesMetadata.find(
          (attr) => attr.id === ATTRIBUTE_QUESTION_TYPE,
        )
      })

      test('exists in metadata', () => {
        expect(typeAttr).toBeDefined()
      })

      test('has correct initial value', () => {
        expect(typeAttr?.initialValue).toBe(QUESTION_TYPE_TEXT)
      })

      test('has no type limits (applies to all types)', () => {
        expect(typeAttr?.typesLimit).toEqual([])
      })

      test('has schema spec', () => {
        expect(typeAttr?.schemaSpec).toBeDefined()
      })
    })

    describe('Required Attribute', () => {
      let requiredAttr: AttributeMeta | undefined

      beforeEach(() => {
        requiredAttr = attributesMetadata.find(
          (attr) => attr.id === ATTRIBUTE_QUESTION_REQUIRED,
        )
      })

      test('exists in metadata', () => {
        expect(requiredAttr).toBeDefined()
      })

      test('has correct initial value', () => {
        expect(requiredAttr?.initialValue).toBe(true)
      })

      test('has no type limits (applies to all types)', () => {
        expect(requiredAttr?.typesLimit).toEqual([])
      })

      test('has schema spec', () => {
        expect(requiredAttr?.schemaSpec).toBeDefined()
      })
    })

    describe('Input Size Attribute', () => {
      let inputSizeAttr: AttributeMeta | undefined

      beforeEach(() => {
        inputSizeAttr = attributesMetadata.find(
          (attr) => attr.id === ATTRIBUTE_QUESTION_INPUT_SIZE,
        )
      })

      test('exists in metadata', () => {
        expect(inputSizeAttr).toBeDefined()
      })

      test('has correct initial value', () => {
        expect(inputSizeAttr?.initialValue).toBe(
          ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
        )
      })

      test('is limited to text questions only', () => {
        expect(inputSizeAttr?.typesLimit).toEqual([QUESTION_TYPE_TEXT])
      })

      test('has schema spec', () => {
        expect(inputSizeAttr?.schemaSpec).toBeDefined()
      })
    })

    describe('Length Min/Max Attribute', () => {
      let lengthMinMaxAttr: AttributeMeta | undefined

      beforeEach(() => {
        lengthMinMaxAttr = attributesMetadata.find(
          (attr) => attr.id === ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
        )
      })

      test('exists in metadata', () => {
        expect(lengthMinMaxAttr).toBeDefined()
      })

      test('has correct initial value structure', () => {
        expect(lengthMinMaxAttr?.initialValue).toEqual({
          min: 0,
          max: 0,
        })
      })

      test('is limited to text questions only', () => {
        expect(lengthMinMaxAttr?.typesLimit).toEqual([QUESTION_TYPE_TEXT])
      })

      test('has schema spec', () => {
        expect(lengthMinMaxAttr?.schemaSpec).toBeDefined()
      })
    })

    describe('Choose Min/Max Attribute', () => {
      let chooseMinMaxAttr: AttributeMeta | undefined

      beforeEach(() => {
        chooseMinMaxAttr = attributesMetadata.find(
          (attr) => attr.id === ATTRIBUTE_CHOICE_MIN_MAX,
        )
      })

      test('exists in metadata', () => {
        expect(chooseMinMaxAttr).toBeDefined()
      })

      test('has correct initial value structure', () => {
        expect(chooseMinMaxAttr?.initialValue).toEqual({
          min: 0,
          max: 0,
        })
      })

      test('is limited to answer-option question types only', () => {
        expect(chooseMinMaxAttr?.typesLimit).toEqual([
          QUESTION_TYPE_CHECKBOX,
          QUESTION_TYPE_DROPDOWN,
          QUESTION_TYPE_BUTTON,
          QUESTION_TYPE_IMAGE_SELECT,
        ])
      })

      test('has schema spec', () => {
        expect(chooseMinMaxAttr?.schemaSpec).toBeDefined()
      })
    })

    describe('Number Min/Max Attribute', () => {
      let numberMinMaxAttr: AttributeMeta | undefined

      beforeEach(() => {
        numberMinMaxAttr = attributesMetadata.find(
          (attr) => attr.id === ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
        )
      })

      test('exists in metadata', () => {
        expect(numberMinMaxAttr).toBeDefined()
      })

      test('has correct initial value structure', () => {
        expect(numberMinMaxAttr?.initialValue).toEqual({
          min: 0,
          max: 0,
        })
      })

      test('is limited to number questions only', () => {
        expect(numberMinMaxAttr?.typesLimit).toEqual([QUESTION_TYPE_NUMBER])
      })

      test('has schema spec', () => {
        expect(numberMinMaxAttr?.schemaSpec).toBeDefined()
      })
    })

    describe('Number Negative Allowed Attribute', () => {
      let negAllowedAttr: AttributeMeta | undefined

      beforeEach(() => {
        negAllowedAttr = attributesMetadata.find(
          (attr) => attr.id === ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
        )
      })

      test('exists in metadata', () => {
        expect(negAllowedAttr).toBeDefined()
      })

      test('has correct initial value', () => {
        expect(negAllowedAttr?.initialValue).toBe(false)
      })

      test('is limited to number questions only', () => {
        expect(negAllowedAttr?.typesLimit).toEqual([QUESTION_TYPE_NUMBER])
      })

      test('has schema spec', () => {
        expect(negAllowedAttr?.schemaSpec).toBeDefined()
      })
    })

    describe('Matrix Orientation Attribute', () => {
      let matrixOrientationAttr: AttributeMeta | undefined

      beforeEach(() => {
        matrixOrientationAttr = attributesMetadata.find(
          (attr) => attr.id === ATTRIBUTE_MATRIX_ORIENTATION,
        )
      })

      test('exists in metadata', () => {
        expect(matrixOrientationAttr).toBeDefined()
      })

      test('has correct initial value', () => {
        expect(matrixOrientationAttr?.initialValue).toBe(
          MATRIX_ORIENTATION_SUBQUESTIONS_ROWS,
        )
      })

      test('is limited to matrix questions only', () => {
        expect(matrixOrientationAttr?.typesLimit).toEqual(MATRIX_QUESTION_TYPES)
      })

      test('has schema spec', () => {
        expect(matrixOrientationAttr?.schemaSpec).toBeDefined()
      })
    })
  })

  describe('Validation', () => {
    describe('Choose Min/Max Validation', () => {
      let chooseMinMaxAttr: AttributeMeta | undefined
      let schema: Schema

      beforeEach(() => {
        chooseMinMaxAttr = attributesMetadata.find(
          (attr) => attr.id === ATTRIBUTE_CHOICE_MIN_MAX,
        )
        schema = new Schema(chooseMinMaxAttr?.schemaSpec)
      })

      test('should validate when min equals max', async () => {
        const data = { min: 2, max: 2 }
        const result = await schema.validate(data)

        expect(result.isValid).toBe(true)
        expect(result.errors).toEqual({})
      })

      test('should validate when max is greater than min', async () => {
        const data = { min: 2, max: 5 }
        const result = await schema.validate(data)

        expect(result.isValid).toBe(true)
        expect(result.errors).toEqual({})
      })

      test('should validate when both are zero (no limit)', async () => {
        const data = { min: 0, max: 0 }
        const result = await schema.validate(data)

        expect(result.isValid).toBe(true)
        expect(result.errors).toEqual({})
      })

      test('should validate when min is zero and max is set (no minimum limit)', async () => {
        const data = { min: 0, max: 5 }
        const result = await schema.validate(data)

        expect(result.isValid).toBe(true)
        expect(result.errors).toEqual({})
      })

      test('should validate when max is zero and min is set (no maximum limit)', async () => {
        const data = { min: 2, max: 0 }
        const result = await schema.validate(data)

        expect(result.isValid).toBe(true)
        expect(result.errors).toEqual({})
      })

      test('should fail validation when min is greater than max', async () => {
        const data = { min: 5, max: 2 }
        const result = await schema.validate(data)

        expect(result.isValid).toBe(false)
        expect(result.errors.max).toBeDefined()
        expect(result.errors.max).toContain('Min cannot be greater than Max')
      })

      test('should fail validation when min is much greater than max', async () => {
        const data = { min: 10, max: 1 }
        const result = await schema.validate(data)

        expect(result.isValid).toBe(false)
        expect(result.errors.max).toBeDefined()
        expect(result.errors.max).toContain('Min cannot be greater than Max')
      })

      test('should fail when min is missing', async () => {
        const data = { max: 5 }
        const result = await schema.validate(data)

        expect(result.isValid).toBe(false)
        expect(result.errors.min).toBeDefined()
      })

      test('should fail when max is missing', async () => {
        const data = { min: 2 }
        const result = await schema.validate(data)

        expect(result.isValid).toBe(false)
        expect(result.errors.max).toBeDefined()
      })
    })
  })
})
