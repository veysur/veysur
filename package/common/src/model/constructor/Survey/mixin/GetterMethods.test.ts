import { Survey } from '../../Survey'
import { SettingSurvey } from '../../SettingSurvey'

describe('Survey GetterMethods - getContentFormat', () => {
  test('inherits project default when survey content is null', () => {
    const survey = new Survey({ _id: '1', createdById: 'u1', name: 'Test' })
    const defaults = new SettingSurvey({ _id: 's1' }).updateContentFormat({
      htmlAllowed: true,
      markdownAllowed: false,
      scriptTagsAllowed: true,
    })

    expect(survey.getContentFormat(defaults)).toEqual({
      htmlAllowed: true,
      markdownAllowed: false,
      scriptTagsAllowed: true,
    })
  })

  test('survey-level override wins over project default', () => {
    const survey = new Survey({
      _id: '1',
      createdById: 'u1',
      name: 'Test',
      contentFormat: { htmlAllowed: false, markdownAllowed: true },
    })
    const defaults = new SettingSurvey({ _id: 's1' }).updateContentFormat({
      htmlAllowed: true,
      markdownAllowed: false,
    })

    expect(survey.getContentFormat(defaults)).toEqual({
      htmlAllowed: false,
      markdownAllowed: true,
      scriptTagsAllowed: defaults.contentFormat.scriptTagsAllowed,
    })
  })
})
