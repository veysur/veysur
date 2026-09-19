// cspell:disable
import { SurveyAnswerOption } from './SurveyAnswerOption'

describe('SurveyAnswerOption', () => {
  const imagePathStr = 'proj/survey/s1/imgset-abc/edited.jpg'
  const imageValue = { path: imagePathStr, fileId: 'file-123' }
  const imageMap = { en: imageValue }

  let answerOption: SurveyAnswerOption

  beforeEach(() => {
    answerOption = new SurveyAnswerOption({
      createdById: 'user1',
      code: 'A001',
      label: { en: 'Original Answer' },
    })
  })

  test('constructor initializes properties correctly', () => {
    expect(answerOption._id).toBeDefined()
    expect(answerOption.createdById).toBe('user1')
    expect(answerOption.code).toBe('A001')
    expect(answerOption.label).toEqual({ en: 'Original Answer' })
    expect(answerOption.createdAt).toBeInstanceOf(Date)
    expect(answerOption.updatedAt).toBeInstanceOf(Date)
    expect(answerOption.image).toBeNull()
    expect(answerOption.hasImage()).toBe(false)
  })

  test('constructor uses default labels when not provided', () => {
    const emptyAnswer = new SurveyAnswerOption({})
    expect(emptyAnswer._id).toBeDefined()
    expect(emptyAnswer.code).toBe('')
    expect(emptyAnswer.label).toEqual({})
    expect(emptyAnswer.image).toBeNull()
    expect(emptyAnswer.hasImage()).toBe(false)
  })

  test('update method returns a new instance with updatedAt properties', () => {
    const updatedAnswer = answerOption.update({
      label: { en: 'Updated Answer' },
    })
    expect(updatedAnswer).not.toBe(answerOption)
    expect(updatedAnswer.label).toEqual({ en: 'Updated Answer' })
    expect(updatedAnswer._id).toBe(answerOption._id)
  })

  describe('updateLabel', () => {
    test('updates label in the default language (en)', () => {
      const updatedOption = answerOption.updateLabel('New Answer')
      expect(updatedOption).not.toBe(answerOption)
      expect(updatedOption.label.en).toBe('New Answer')
      expect(answerOption.label.en).toBe('Original Answer')
    })

    test('updates label in a specified language', () => {
      const updatedOption = answerOption.updateLabel('Nouvelle Réponse', 'fr')
      expect(updatedOption.label.en).toBe('Original Answer')
      expect(updatedOption.label.fr).toBe('Nouvelle Réponse')
    })

    test('adds a new language when updating label', () => {
      const updatedOption = answerOption.updateLabel('Nueva Respuesta', 'esp')
      expect(updatedOption.label.en).toBe('Original Answer')
      expect(updatedOption.label.esp).toBe('Nueva Respuesta')
    })

    test('overwrites existing label in the specified language', () => {
      const multi = new SurveyAnswerOption({
        createdById: 'user1',
        code: 'A001',
        label: { en: 'Original Answer', fr: 'Réponse Originale' },
      })
      const updatedAt = multi.updateLabel('Réponse Mise à Jour', 'fr')
      expect(updatedAt.label.en).toBe('Original Answer')
      expect(updatedAt.label.fr).toBe('Réponse Mise à Jour')
      expect(multi.label.fr).toBe('Réponse Originale')
    })

    test('keeps an emptied default language as an empty string', () => {
      const multi = new SurveyAnswerOption({
        createdById: 'user1',
        code: 'A001',
        label: { en: 'Original Answer', fr: 'Réponse Originale' },
      })
      const updated = multi.updateLabel('', 'en', 'en')
      expect(updated.label.en).toBe('')
      expect(updated.label.fr).toBe('Réponse Originale')
    })

    test('unsets an emptied secondary language', () => {
      const multi = new SurveyAnswerOption({
        createdById: 'user1',
        code: 'A001',
        label: { en: 'Original Answer', fr: 'Réponse Originale' },
      })
      const updated = multi.updateLabel('', 'fr', 'en')
      expect('fr' in updated.label).toBe(false)
      expect(updated.label.en).toBe('Original Answer')
    })
  })

  describe('image methods', () => {
    test('hasImage returns false when image is null', () => {
      expect(answerOption.hasImage()).toBe(false)
    })

    test('hasImage returns true when image map is set', () => {
      const withImage = answerOption.update({ image: imageMap })
      expect(withImage.hasImage()).toBe(true)
    })

    test('hasImage(lang) returns true for existing language', () => {
      const withImage = answerOption.update({ image: imageMap })
      expect(withImage.hasImage('en', 'en')).toBe(true)
    })

    test('hasImage(lang) returns false for missing language without fallback', () => {
      const withImage = answerOption.update({ image: imageMap })
      expect(withImage.hasImage('fr', 'fr')).toBe(false)
    })

    test('hasImage(lang) falls back to langDefault', () => {
      const withImage = answerOption.update({ image: imageMap })
      expect(withImage.hasImage('fr', 'en')).toBe(true)
    })

    test('getImage returns value for matching language', () => {
      const withImage = answerOption.update({ image: imageMap })
      expect(withImage.getImage('en', 'en')).toEqual(imageValue)
    })

    test('getImage falls back to langDefault', () => {
      const withImage = answerOption.update({ image: imageMap })
      expect(withImage.getImage('fr', 'en')).toEqual(imageValue)
    })

    test('getImage returns null when neither lang nor langDefault has image', () => {
      const withImage = answerOption.update({ image: imageMap })
      expect(withImage.getImage('fr', 'de')).toBeNull()
    })

    test('setImageLang adds an image for a language', () => {
      const withImage = answerOption.setImageLang(imageValue, 'en')
      expect(withImage.image).toEqual({ en: imageValue })
    })

    test('setImageLang keeps a null marker when image is null (for clear detection)', () => {
      const withImage = answerOption.update({ image: imageMap })
      const cleared = withImage.setImageLang(null, 'en')
      // The key stays with a null value so the API can detect the clear operation.
      expect(cleared.image).toEqual({ en: null })
      expect(cleared.hasImage()).toBe(false)
    })

    test('setImageLang keeps other languages when nulling one', () => {
      const frValue = { path: 'fr/path/edited.jpg', fileId: 'fr-file' }
      const withTwo = answerOption.update({
        image: { en: imageValue, fr: frValue },
      })
      const withoutEn = withTwo.setImageLang(null, 'en')
      // en is kept as null (clear marker); fr remains unchanged.
      expect(withoutEn.image).toEqual({ en: null, fr: frValue })
    })

    test('getEditedUrl returns correct URL', () => {
      const withImage = answerOption.update({ image: imageMap })
      expect(withImage.getEditedUrl('en', 'en')).toBe(
        '/veysur-files/proj/survey/s1/imgset-abc/edited.jpg',
      )
    })

    test('getOriginalUrl derives correct URL', () => {
      const withImage = answerOption.update({ image: imageMap })
      expect(withImage.getOriginalUrl('en', 'en')).toBe(
        '/veysur-files/proj/survey/s1/imgset-abc/original.jpg',
      )
    })

    test('getThumbnailUrl derives correct URL', () => {
      const withImage = answerOption.update({ image: imageMap })
      expect(withImage.getThumbnailUrl('en', 'en')).toBe(
        '/veysur-files/proj/survey/s1/imgset-abc/thumb.jpg',
      )
    })

    test('getImageSetId extracts imageSetId from path', () => {
      const withImage = answerOption.update({ image: imageMap })
      expect(withImage.getImageSetId('en', 'en')).toBe('abc')
    })

    test('all URL methods return null when image is null', () => {
      expect(answerOption.getEditedUrl('en', 'en')).toBeNull()
      expect(answerOption.getOriginalUrl('en', 'en')).toBeNull()
      expect(answerOption.getThumbnailUrl('en', 'en')).toBeNull()
      expect(answerOption.getImageSetId('en', 'en')).toBeNull()
    })

    test('clearImage sets image to null', () => {
      const withImage = answerOption.update({ image: imageMap })
      const cleared = withImage.clearImage()
      expect(cleared.image).toBeNull()
      expect(cleared.hasImage()).toBe(false)
    })

    test('clearImage(lang) keeps a null marker for that language', () => {
      const frValue = { path: 'fr/path/edited.jpg', fileId: 'fr-file' }
      const withTwo = answerOption.update({
        image: { en: imageValue, fr: frValue },
      })
      const withoutEn = withTwo.clearImage('en')
      // en is kept as null (clear marker); fr remains unchanged.
      expect(withoutEn.image).toEqual({ en: null, fr: frValue })
      expect(withoutEn.hasImage()).toBe(true) // fr still has an image
      expect(withoutEn.hasImage('en', 'en')).toBe(false) // en-specific cleared, no en-fallback
    })
  })
})
