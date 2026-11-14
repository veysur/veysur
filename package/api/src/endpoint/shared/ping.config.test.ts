import { pingConfig as generated } from 'model/service/ServicePing.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/ping.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('ping endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        getSend: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {},
          enable: true,
          errors: {},
          method: 'ping',
          path: '/',
          verbs: ['get'],
        },
      },
      service: 'ping',
    })
  })
})
