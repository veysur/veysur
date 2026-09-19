export const versionConfig = {
  service: 'version',
  acl: {
    rules: [{ allow: true, role: 'all' }],
  },
  endpoints: {
    getGet: {
      path: '/',
      method: 'get',
      verbs: ['get'],
    },
  },
}

export default versionConfig
