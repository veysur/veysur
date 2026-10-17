import { SettingSurvey } from '../../SettingSurvey'

describe('SettingSurvey Maps Methods', () => {
  test('defaults to no project key', () => {
    expect(new SettingSurvey({ _id: '1' }).maps.googleApiKey).toBe('')
  })

  test('setMapsProperty stores the key on a new instance', () => {
    const setting = new SettingSurvey({ _id: '1' })
    const updated = setting.setMapsProperty('googleApiKey', 'AIza-key')

    expect(updated).not.toBe(setting)
    expect(updated.maps.googleApiKey).toBe('AIza-key')
    expect(setting.maps.googleApiKey).toBe('')
  })

  test('setMapsProperty returns the same instance for an unchanged value', () => {
    const setting = new SettingSurvey({
      _id: '1',
      maps: { googleApiKey: 'AIza-key' },
    })
    expect(setting.setMapsProperty('googleApiKey', 'AIza-key')).toBe(setting)
  })

  test('updateMaps merges updates', () => {
    const setting = new SettingSurvey({ _id: '1' })
    expect(setting.updateMaps({ googleApiKey: 'k2' }).maps.googleApiKey).toBe(
      'k2',
    )
  })
})
