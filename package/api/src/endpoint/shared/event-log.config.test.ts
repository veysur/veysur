import { eventLogConfig as generated } from 'model/service/ServiceEventLog.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/event-log.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('eventLog endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        log: {
          acl: [
            {
              allow: true,
              role: 'authedAdmin',
            },
          ],
          data: {
            action: {
              required: true,
              src: 'body',
            },
            metadata: {
              required: false,
              src: 'body',
            },
            projectId: {
              required: false,
              src: 'header',
              srcPath: 'x-project-id',
            },
            userId: {
              required: false,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'log',
          path: '/',
          verbs: ['post'],
        },
      },
      service: 'eventLog',
    })
  })
})
