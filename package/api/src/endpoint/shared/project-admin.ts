export const projectAdminConfig = {
  service: 'projectAdmin',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    getInviteDetail: {
      path: '/accept-detail',
      method: 'getInviteDetail',
      verbs: ['get'],
      data: {
        code: { src: 'query' },
        email: { src: 'query' },
      },
      acl: {
        // Public: a caller with no account yet must be able to look up the
        // invite before creating one. The random code + matching email is
        // the authorization proof, same trust model as the emailed link.
        rules: [{ allow: true, role: 'all' }],
      },
    },
    postAccept: {
      path: '/accept',
      method: 'accept',
      verbs: ['post'],
      data: {
        code: { src: 'body' },
        email: { src: 'body' },
      },
      acl: {
        rules: [{ allow: true, role: 'authedAdmin' }],
      },
    },
    postAcceptNewAccount: {
      path: '/accept-new-account',
      method: 'acceptNewAccount',
      verbs: ['post'],
      data: {
        code: { src: 'body', required: true },
        email: { src: 'body', required: true },
        nameFirst: { src: 'body', required: true },
        nameLast: { src: 'body', required: false },
        password: { src: 'body', required: true },
        ip: { src: 'request', required: false },
        userAgent: { srcPath: 'User-Agent', src: 'header', required: false },
        deviceId: { srcPath: 'Device-Id', src: 'header', required: false },
        deviceName: { srcPath: 'Device-Name', src: 'header', required: false },
        deviceSystem: {
          srcPath: 'Device-System',
          src: 'header',
          required: false,
        },
        deviceSystemVersion: {
          srcPath: 'Device-System-Version',
          src: 'header',
          required: false,
        },
        buildVersion: {
          srcPath: 'Build-Version',
          src: 'header',
          required: false,
        },
        buildNumber: {
          srcPath: 'Build-Number',
          src: 'header',
          required: false,
        },
        jwtConfig: {
          src: 'config',
          srcPath: 'model.app.jwt',
          required: true,
        },
      },
      acl: {
        // Public: this is the account-creation path for an invitee who has
        // no account yet, so it must be reachable unauthenticated.
        rules: [{ allow: true, role: 'all' }],
      },
    },
    postDecline: {
      path: '/decline',
      method: 'decline',
      verbs: ['post'],
      data: {
        code: { src: 'body' },
        email: { src: 'body' },
      },
      acl: {
        rules: [{ allow: true, role: 'authedAdmin' }],
      },
    },
    getProjectAdmins: {
      path: '/:projectId',
      method: 'listWithUsers',
      verbs: ['get'],
      data: {
        projectId: { src: 'param' },
        limit: { src: 'query', type: Number },
        skip: { src: 'query', type: Number },
      },
      acl: {
        rules: [
          { allow: true, role: 'projectAdmin' },
          { allow: true, role: 'projectOwner' },
        ],
      },
    },
    deleteProjectAdmin: {
      path: '/:projectId/:projectAdminId',
      method: 'remove',
      verbs: ['delete'],
      data: {
        projectId: { src: 'param' },
        projectAdminId: { src: 'param' },
      },
      acl: {
        rules: [
          { allow: true, role: 'projectAdmin' },
          { allow: true, role: 'projectOwner' },
        ],
      },
    },
    postInvite: {
      path: '/:projectId/invite',
      method: 'invite',
      verbs: ['post'],
      data: {
        projectId: { src: 'param' },
        nameFirst: { src: 'body' },
        nameLast: { src: 'body' },
        email: { src: 'body' },
      },
      acl: {
        rules: [{ allow: true, role: 'projectOwner' }],
      },
      response: {
        error: {
          PlanLimitExceededError: { http: { code: 402 } },
        },
      },
    },
  },
}

export default projectAdminConfig
