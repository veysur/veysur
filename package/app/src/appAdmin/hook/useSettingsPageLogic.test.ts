import { createSettingsHandlers } from './useSettingsPageLogic'

describe('createSettingsHandlers handleStringListChange', () => {
  test('routes access list changes to the access update', () => {
    const updateAccessProperty = jest.fn()
    const { handleStringListChange } = createSettingsHandlers({
      updateAccessProperty,
    })

    handleStringListChange('access', 'embedDomains', ['a.com'])
    handleStringListChange('access', 'embedDomains', null)

    expect(updateAccessProperty).toHaveBeenNthCalledWith(1, 'embedDomains', [
      'a.com',
    ])
    expect(updateAccessProperty).toHaveBeenNthCalledWith(
      2,
      'embedDomains',
      null,
    )
  })

  test('ignores sections that have no list settings', () => {
    const updateAccessProperty = jest.fn()
    const { handleStringListChange } = createSettingsHandlers({
      updateAccessProperty,
    })

    handleStringListChange('presentation', 'anything', ['x'])

    expect(updateAccessProperty).not.toHaveBeenCalled()
  })
})
