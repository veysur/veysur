export const passwordConfig = {
  service: 'password',
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    postResetEmail: {
      path: '/reset-email',
      method: 'resetEmail',
      verbs: ['post'],
      data: {
        email: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'all' }],
      },
    },
    put: {
      path: '/',
      method: 'put',
      verbs: ['put'],
      data: {
        email: { src: 'body', required: true },
        token: { src: 'body', required: true },
        password: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'all' }],
      },
    },
  },
}

export default passwordConfig
