// cspell:ignore Nombre Grupo Descripción Origine unsets
import { SurveySection } from './SurveySection'

describe('SurveySection', () => {
  describe('updateName', () => {
    test('updates name in the default language', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        name: { en: 'Original Group Name' },
      })

      const updatedGroup = group.updateName('New Group Name')

      expect(updatedGroup).not.toBe(group)
      expect(updatedGroup.name.en).toBe('New Group Name')
      expect(group.name.en).toBe('Original Group Name')
    })

    test('updates name in a specified language', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        name: { en: 'Original Group Name', fr: 'Nom de Groupe Original' },
      })

      const updatedGroup = group.updateName('Nouveau Nom de Groupe', 'fr')

      expect(updatedGroup).not.toBe(group)
      expect(updatedGroup.name.en).toBe('Original Group Name')
      expect(updatedGroup.name.fr).toBe('Nouveau Nom de Groupe')
      expect(group.name.fr).toBe('Nom de Groupe Original')
    })

    test('adds a new language when updating name', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        name: { en: 'Original Group Name' },
      })

      const updatedGroup = group.updateName('Nombre del Grupo', 'esp')

      expect(updatedGroup).not.toBe(group)
      expect(updatedGroup.name.en).toBe('Original Group Name')
      expect(updatedGroup.name.esp).toBe('Nombre del Grupo')
      expect(group.name.esp).toBeUndefined()
    })

    test('keeps an emptied default language as an empty string', () => {
      const group = new SurveySection({
        _id: '1',
        name: { en: 'Original', fr: 'Origine' },
      })
      const updated = group.updateName('', 'en', 'en')
      expect(updated.name.en).toBe('')
      expect(updated.name.fr).toBe('Origine')
    })

    test('unsets an emptied secondary language', () => {
      const group = new SurveySection({
        _id: '1',
        name: { en: 'Original', fr: 'Origine' },
      })
      const updated = group.updateName('', 'fr', 'en')
      expect('fr' in updated.name).toBe(false)
      expect(updated.name.en).toBe('Original')
    })
  })
  describe('updateDescription', () => {
    test('updates description in the default language', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        desc: { en: 'Original Group Description' },
      })

      const updatedGroup = group.updateDescription('New Group Description')

      expect(updatedGroup).not.toBe(group)
      expect(updatedGroup.desc.en).toBe('New Group Description')
      expect(group.desc.en).toBe('Original Group Description')
    })

    test('updates description in a specified language', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        desc: {
          en: 'Original Group Description',
          fr: 'Description de Groupe Original',
        },
      })

      const updatedGroup = group.updateDescription(
        'Nouveau Description de Groupe',
        'fr',
      )

      expect(updatedGroup).not.toBe(group)
      expect(updatedGroup.desc.en).toBe('Original Group Description')
      expect(updatedGroup.desc.fr).toBe('Nouveau Description de Groupe')
      expect(group.desc.fr).toBe('Description de Groupe Original')
    })

    test('adds a new language when updating description', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        desc: { en: 'Original Group Description' },
      })

      const updatedGroup = group.updateDescription(
        'Descripción del Grupo',
        'esp',
      )

      expect(updatedGroup).not.toBe(group)
      expect(updatedGroup.desc.en).toBe('Original Group Description')
      expect(updatedGroup.desc.esp).toBe('Descripción del Grupo')
      expect(group.desc.esp).toBeUndefined()
    })

    test('initializes L10n when desc is null', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        name: { en: 'Group Name' },
        desc: null,
      })

      expect(group.desc).toBeNull()

      const updatedGroup = group.updateDescription('New Description')

      expect(updatedGroup).not.toBe(group)
      expect(updatedGroup.desc).not.toBeNull()
      expect(updatedGroup.desc.en).toBe('New Description')
      expect(group.desc).toBeNull()
    })

    test('initializes L10n with specified language when desc is null', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        name: { en: 'Group Name' },
        desc: null,
      })

      const updatedGroup = group.updateDescription(
        'Descripción del Grupo',
        'esp',
      )

      expect(updatedGroup).not.toBe(group)
      expect(updatedGroup.desc).not.toBeNull()
      expect(updatedGroup.desc.esp).toBe('Descripción del Grupo')
      expect(group.desc).toBeNull()
    })
  })

  describe('deleteDescription', () => {
    test('sets desc to null', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        name: { en: 'Group Name' },
        desc: { en: 'Original Description' },
      })

      expect(group.desc).not.toBeNull()
      expect(group.desc.en).toBe('Original Description')

      const updatedGroup = group.deleteDescription()

      expect(updatedGroup).not.toBe(group)
      expect(updatedGroup.desc).toBeNull()
      expect(group.desc.en).toBe('Original Description')
    })

    test('returns new instance when desc is already null', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        name: { en: 'Group Name' },
        desc: null,
      })

      expect(group.desc).toBeNull()

      const updatedGroup = group.deleteDescription()

      expect(updatedGroup).not.toBe(group)
      expect(updatedGroup.desc).toBeNull()
    })
  })

  describe('constructor with null description', () => {
    test('initializes with null desc when not provided', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        name: { en: 'Group Name' },
      })

      expect(group.desc).toBeNull()
    })

    test('initializes with null desc when explicitly set to null', () => {
      const group = new SurveySection({
        _id: '1',
        surveyId: '1',
        createdById: '1',
        code: 'G1',
        name: { en: 'Group Name' },
        desc: null,
      })

      expect(group.desc).toBeNull()
    })
  })
})
