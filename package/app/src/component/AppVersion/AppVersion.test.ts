import { formatBuildInfo } from './AppVersion'

describe('formatBuildInfo', () => {
  it('shows only the veysur SHA when there is no cloud SHA', () => {
    expect(
      formatBuildInfo({ version: '0.1.0', coreSha: 'abc1234', cloudSha: '' }),
    ).toBe('v0.1.0 · abc1234')
  })

  it('labels both SHAs and omits the version when a cloud SHA is present', () => {
    expect(
      formatBuildInfo({
        version: '0.1.0',
        coreSha: 'abc1234',
        cloudSha: 'def5678',
      }),
    ).toBe('core abc1234 · cloud def5678')
  })
})
