import { notificationConfig as generated } from 'model/service/core/ServiceNotification.endpoints'

type Entry = {
  src?: string
  srcPath?: string
  required?: boolean
  defaultValue?: unknown
}

/** What the config means to the request parser, independent of how it is spelled. */
function project(config: {
  service: string
  endpoints: Record<
    string,
    {
      method: string
      verbs: string[]
      path?: string
      data: Record<string, Entry>
      acl: { rules: object[] }
    }
  >
}) {
  return {
    service: config.service,
    endpoints: Object.entries(config.endpoints).map(([key, ep]) => ({
      key,
      method: ep.method,
      verbs: ep.verbs,
      path: ep.path,
      acl: ep.acl.rules,
      data: Object.fromEntries(
        Object.entries(ep.data).map(([name, d]) => [
          name,
          {
            src: d.src,
            srcPath: d.srcPath,
            required: d.required === true,
            defaultValue: d.defaultValue,
          },
        ]),
      ),
    })),
  }
}

// Recorded from the hand-written endpoint/core/notification.ts before it was
// deleted. `default: n` there was never read by the request parser, so the
// generated `defaultValue` is the one intentional difference.
describe('notification endpoint config', () => {
  const project_ = { src: 'header', srcPath: 'X-Project-Id', required: true }
  const rule = [{ allow: true, role: 'projectAdmin' }]

  it('matches the previous hand-written config', () => {
    expect(project(generated)).toEqual({
      service: 'notification',
      endpoints: [
        {
          key: 'list',
          method: 'list',
          verbs: ['get'],
          path: '/list',
          acl: rule,
          data: {
            projectId: { ...project_, defaultValue: undefined },
            page: { src: 'query', required: false, defaultValue: 1 },
            perPage: { src: 'query', required: false, defaultValue: 20 },
          },
        },
        {
          key: 'markRead',
          method: 'markRead',
          verbs: ['post'],
          path: '/:notificationId/read',
          acl: rule,
          data: {
            notificationId: { src: 'param', required: true },
            projectId: { ...project_, defaultValue: undefined },
          },
        },
        {
          key: 'dismiss',
          method: 'dismiss',
          verbs: ['delete'],
          path: '/:notificationId',
          acl: rule,
          data: {
            notificationId: { src: 'param', required: true },
            projectId: { ...project_, defaultValue: undefined },
          },
        },
      ],
    })
  })

  it('denies by default', () => {
    expect(generated.acl.rules).toEqual([{ allow: false, role: 'all' }])
  })
})
