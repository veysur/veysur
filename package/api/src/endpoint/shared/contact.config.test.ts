import { contactConfig as generated } from 'model/service/ServiceContact.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/shared/contact.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
describe('contact endpoint config', () => {
  it('matches the previous hand-written config', () => {
    expect(projectEndpointConfig(generated)).toEqual({
      enable: true,
      endpoints: {
        submit: {
          acl: [
            {
              allow: true,
              role: 'all',
            },
          ],
          data: {
            email: {
              required: true,
              src: 'body',
            },
            message: {
              required: true,
              src: 'body',
            },
            name: {
              required: true,
              src: 'body',
            },
            subject: {
              required: true,
              src: 'body',
            },
          },
          enable: true,
          errors: {},
          method: 'submit',
          path: '/submit',
          verbs: ['post'],
        },
      },
      service: 'contact',
    })
  })
})
