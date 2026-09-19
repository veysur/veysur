export const pingConfig = {
  service: 'ping',
  acl: {
    rules: [{ allow: true, role: 'all' }],
  },
  endpoints: {
    getSend: {
      path: '/',
      method: 'ping',
      verbs: ['get'],
    },
  },
}

export default pingConfig
