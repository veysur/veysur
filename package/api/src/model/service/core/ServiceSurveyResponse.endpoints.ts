// Generated from ServiceSurveyResponse.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyResponseConfig = {
  service: 'surveyResponse',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    postSurveyResponse: {
      method: 'create',
      verbs: ['post'],
      path: '/:surveyId/:snapshotId',
      data: {
        response: { src: 'body', required: true },
        surveyId: { src: 'param', required: true, type: String },
        snapshotId: { src: 'param', required: true, type: String },
        publicationId: { src: 'body', required: false, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    getSurveyResponse: {
      method: 'getOne',
      verbs: ['get'],
      path: '/:surveyId/:responseId',
      data: {
        responseId: { src: 'param', required: true, type: String },
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
    getAllSurveyResponse: {
      method: 'getAll',
      verbs: ['get'],
      path: '/:surveyId',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        snapshotId: { src: 'query', required: false, type: String },
        publicationId: { src: 'query', required: false, type: String },
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
        completed: { src: 'query', required: false, type: String },
        startDate: { src: 'query', required: false, type: String },
        endDate: { src: 'query', required: false, type: String },
        dateField: { src: 'query', required: false, type: String },
        search: { src: 'query', required: false, type: String },
        merged: { src: 'query', required: false, type: String },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    updateSurveyResponse: {
      method: 'update',
      verbs: ['put'],
      path: '/:surveyId/:responseId',
      data: {
        responseId: { src: 'param', required: true, type: String },
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        response: { src: 'body', required: true },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    deleteSurveyResponse: {
      method: 'delete',
      verbs: ['delete'],
      path: '/:surveyId/:responseId',
      data: {
        responseId: { src: 'param', required: true, type: String },
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

export default surveyResponseConfig
