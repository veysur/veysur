export const settingProject = {
  service: 'settingProject',
  enable: true,
  acl: {
    rules: [{ allow: false, role: 'all' }],
  },
  endpoints: {
    getSettingProject: {
      path: '/',
      method: 'getOne',
      verbs: ['get'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    putSettingProjectMaps: {
      path: '/maps',
      method: 'updateMaps',
      verbs: ['put'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        maps: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
    putSettingProjectBotProtection: {
      path: '/bot-protection',
      method: 'updateBotProtection',
      verbs: ['put'],
      data: {
        projectId: { src: 'header', srcPath: 'X-Project-Id', required: true },
        botProtection: { src: 'body', required: true },
      },
      acl: {
        rules: [{ allow: true, role: 'projectAdmin' }],
      },
    },
  },
}

export default settingProject
