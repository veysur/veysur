// Generated from ServiceSurveyParticipantInvite.ts by datacapy-gen. Do not edit.
// cspell:disable
import type { ServerApiConfig } from '@datacapy/server'

export const surveyParticipantEmailConfig = {
  service: 'surveyParticipantEmail',
  path: '/survey-participant',
  enable: true,
  acl: { rules: [{ allow: false, role: 'all' }] },
  endpoints: {
    sendInvitesSurveyParticipant: {
      method: 'send',
      verbs: ['post'],
      path: '/:surveyId/send-invites',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        skip: { src: 'body', required: false, type: Number, defaultValue: 0 },
        batchSize: {
          src: 'body',
          required: false,
          type: Number,
          defaultValue: 100,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
    sendRemindersSurveyParticipant: {
      method: 'sendReminders',
      verbs: ['post'],
      path: '/:surveyId/send-reminders',
      data: {
        surveyId: { src: 'param', required: true, type: String },
        projectId: {
          src: 'header',
          srcPath: 'X-Project-Id',
          required: true,
          type: String,
        },
        skip: { src: 'body', required: false, type: Number, defaultValue: 0 },
        batchSize: {
          src: 'body',
          required: false,
          type: Number,
          defaultValue: 100,
        },
      },
      acl: { rules: [{ allow: true, role: 'projectAdmin' }] },
    },
  },
} satisfies ServerApiConfig

export default surveyParticipantEmailConfig
