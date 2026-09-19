export const eventLogConfig = {
  service: 'eventLog',
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    log: {
      path: '/',
      method: 'log',
      verbs: ['post'],
      data: {
        projectId: { src: 'header', srcPath: 'x-project-id' },
        action: { src: 'body', required: true },
        userId: { src: 'body' },
        metadata: { src: 'body' },
      },
      acl: {
        rules: [{ allow: true, role: 'authedAdmin' }],
      },
    },
  },
}

export default eventLogConfig
