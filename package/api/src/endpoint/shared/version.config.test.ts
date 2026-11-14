import { versionConfig as generated } from 'model/service/ServiceVersion.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/version.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('version endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        getGet: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {},
          enable: true,
          errors: {},
          method: 'get',
          path: '/',
          verbs: ['get'],
        },
      },
      service: 'version',
    })
  })
})
