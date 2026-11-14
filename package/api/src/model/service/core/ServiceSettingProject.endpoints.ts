// Generated from ServiceSettingProject.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const settingProjectConfig = {
  service: 'settingProject',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getSettingProject: {
      method: 'getOne',
      verbs: ['get'],
      path: '/',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    putSettingProjectMaps: {
      method: 'updateMaps',
      verbs: ['put'],
      path: '/maps',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        maps: { src: 'body', required: true },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    putSettingProjectBotProtection: {
      method: 'updateBotProtection',
      verbs: ['put'],
      path: '/bot-protection',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        botProtection: { src: 'body', required: true },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default settingProjectConfig
