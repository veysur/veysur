export const verifyEmailConfig = {
  service: 'verifyEmail',
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    getSend: {
      path: '/send',
      method: 'send',
      verbs: ['get'],
      data: {},
      acl: {
        rules: [{ allow: true, role: 'authedAdmin' }],
      },
    },
    postVerify: {
      path: '/verify',
      method: 'verify',
      verbs: ['post'],
      data: {
        email: { src: 'body', required: true },
        token: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'all' }],
      },
    },
  },
}

export default verifyEmailConfig
