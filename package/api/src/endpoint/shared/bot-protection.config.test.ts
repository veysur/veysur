import { botProtectionConfig as generated } from 'model/service/ServiceBotProtection.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/bot-protection.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('botProtection endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        accountChallenge: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {},
          enable: true,
          errors: {},
          method: 'issueAccountChallenge',
          path: '/challenge',
          verbs: ['post'],
        },
      },
      service: 'botProtection',
    })
  })
})
