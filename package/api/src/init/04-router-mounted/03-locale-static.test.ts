import { hasBuildVersion } from './03-locale-static'

describe('hasBuildVersion', () => {
  test.each(['a1b2c3d', '1.2.3'])('treats %s as a real build version', (v) => {
    expect(hasBuildVersion(v)).toBe(true)
  })

  test.each([undefined, '', 'dev', 'undefined', ['a1b2c3d']])(
    'does not treat %p as a build version',
    (v) => {
      expect(hasBuildVersion(v)).toBe(false)
    },
  )
})
