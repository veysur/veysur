// Generated from ServiceEmailTemplate.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const emailTemplateConfig = {
  service: 'emailTemplate',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getSurveyEmailTemplate: {
      method: 'getOne',
      verbs: ['get'],
      path: '/survey/:surveyId/:type/:lang',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        surveyId: { src: 'param', required: true, type: String },
        type: { src: 'param', required: true, type: String },
        lang: { src: 'param', required: true, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getSurveyEmailTemplates: {
      method: 'getAll',
      verbs: ['get'],
      path: '/survey/:surveyId',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        surveyId: { src: 'param', required: true, type: String },
        includeDefaults: { src: 'query', required: false, type: Boolean },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getProjectEmailTemplates: {
      method: 'getProjectAll',
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
    deleteSurveyEmailTemplate: {
      method: 'deleteOne',
      verbs: ['delete'],
      path: '/survey/:surveyId/:type/:lang',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        surveyId: { src: 'param', required: true, type: String },
        type: { src: 'param', required: true, type: String },
        lang: { src: 'param', required: true, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getProjectEmailTemplate: {
      method: 'getProjectOne',
      verbs: ['get'],
      path: '/:type/:lang',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        type: { src: 'param', required: true, type: String },
        lang: { src: 'param', required: true, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    deleteProjectEmailTemplate: {
      method: 'deleteProjectOne',
      verbs: ['delete'],
      path: '/:type/:lang',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        type: { src: 'param', required: true, type: String },
        lang: { src: 'param', required: true, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    patchSurveyEmailTemplate: {
      method: 'patch',
      verbs: ['patch'],
      path: '/survey/:surveyId',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        surveyId: { src: 'param', required: true, type: String },
        patches: { src: 'body', required: true, type: Array },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    patchProjectEmailTemplate: {
      method: 'patchProject',
      verbs: ['patch'],
      path: '/',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        patches: { src: 'body', required: true, type: Array },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getSystemEmailTemplates: {
      method: 'getSystemTemplates',
      verbs: ['get'],
      path: '/system',
      data: {
        lang: {
          src: 'query',
          required: false,
          type: String,
          defaultValue: 'en',
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getSystemEmailTemplate: {
      method: 'getSystemTemplate',
      verbs: ['get'],
      path: '/system/:type/:lang',
      data: {
        type: { src: 'param', required: true, type: String },
        lang: { src: 'param', required: true, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default emailTemplateConfig
