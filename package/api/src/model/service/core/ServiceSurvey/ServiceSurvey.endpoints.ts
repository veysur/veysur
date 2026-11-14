// Generated from ServiceSurvey.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyConfig = {
  service: 'survey',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    getSurveyTemplateList: {
      method: 'listTemplates',
      verbs: ['get'],
      path: '/template/list',
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
    postSurvey: {
      method: 'create',
      verbs: ['post'],
      path: '/',
      data: {
        survey: { src: 'body', required: true },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        templateId: { src: 'body', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getAllSurvey: {
      method: 'getAll',
      verbs: ['get'],
      path: '/',
      data: {
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        page: { src: 'query', required: false, type: Number, defaultValue: 1 },
        perPage: {
          src: 'query',
          required: false,
          type: Number,
          defaultValue: 20,
        },
        search: { src: 'query', required: false, type: String },
        startDate: { src: 'query', required: false, type: String },
        endDate: { src: 'query', required: false, type: String },
        dateField: {
          src: 'query',
          required: false,
          type: String,
          defaultValue: 'createdAt',
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getSurvey: {
      method: 'getOne',
      verbs: ['get'],
      path: '/:surveyId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        lang: { src: 'query', required: false, type: String },
        defaultLang: { src: 'query', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    patchSurvey: {
      method: 'patch',
      verbs: ['patch'],
      path: '/:surveyId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        patches: { src: 'body', required: true, type: Array },
        originClientId: {
          src: 'header',
          srcPath: 'X-Client-Id',
          required: false,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    deleteSurvey: {
      method: 'delete',
      verbs: ['delete'],
      path: '/:surveyId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default surveyConfig
