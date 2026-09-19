export const userConfig = {
  service: 'user',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    getMe: {
      path: '/me',
      method: 'me',
      verbs: ['get'],
      acl: {
        rules: [{ allow: true, role: 'authedAdmin' }],
      },
    },
    putProfile: {
      path: '/profile',
      method: 'putProfile',
      verbs: ['put'],
      data: {
        data: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'authedAdmin' }],
      },
    },
    postValidatePasswordCurrent: {
      path: '/validate-password-current',
      method: 'validatePasswordCurrent',
      verbs: ['post'],
      data: {
        value: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'authedAdmin' }],
      },
    },
    postValidateEmailNotRegistered: {
      path: '/validate-email-not-registered',
      method: 'validateEmailNotRegistered',
      verbs: ['post'],
      data: {
        value: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'all' }],
      },
    },
  },
}

export default userConfig
