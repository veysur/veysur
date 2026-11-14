import { surveyParticipantConfig as surveyParticipantConfigGenerated } from 'model/service/core/ServiceSurveyParticipant/ServiceSurveyParticipant.endpoints'
import { surveyParticipantImportConfig as surveyParticipantImportConfigGenerated } from 'model/service/core/ServiceSurveyParticipant/ServiceSurveyParticipantImport.endpoints'
import { surveyParticipantExportConfig as surveyParticipantExportConfigGenerated } from 'model/service/core/ServiceSurveyParticipant/ServiceSurveyParticipantExport.endpoints'
import { surveyParticipantEmailConfig as surveyParticipantEmailConfigGenerated } from 'model/service/core/ServiceSurveyParticipant/ServiceSurveyParticipantInvite.endpoints'
import { surveyParticipantGenerateConfig as surveyParticipantGenerateConfigGenerated } from 'model/service/core/ServiceSurveyParticipant/ServiceSurveyParticipantGenerate.endpoints'
import { projectEndpointConfig } from 'test-utils/projectEndpointConfig'

// Recorded from the hand-written endpoint/core/survey-participant.ts before it was deleted. A `default` there
// was never read by the request parser; the generated `defaultValue` is the intentional difference.
// Where a service takes inputs the old config never exposed, they are now declared and appear below.
describe('survey-participant endpoint config', () => {
  it('surveyParticipant matches the previous hand-written config', () => {
    expect(projectEndpointConfig(surveyParticipantConfigGenerated)).toEqual({
      enable: true,
      endpoints: {
        deleteSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            participantId: {
              required: true,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'delete',
          path: '/:surveyId/:participantId',
          verbs: ['delete'],
        },
        getAllSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            completionStatus: {
              required: false,
              src: 'query',
            },
            page: {
              defaultValue: 1,
              required: false,
              src: 'query',
            },
            perPage: {
              defaultValue: 10,
              required: false,
              src: 'query',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            search: {
              required: false,
              src: 'query',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'getAll',
          path: '/:surveyId',
          verbs: ['get'],
        },
        getSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            participantId: {
              required: true,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'getOne',
          path: '/:surveyId/:participantId',
          verbs: ['get'],
        },
        getSurveyParticipantMe: {
          acl: [
            {
              allow: true,
              role: 'participant',
            },
          ],
          data: {
            surveyId: {
              required: false,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'getMe',
          path: '/:surveyId/me',
          verbs: ['get'],
        },
        postSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            participant: {
              required: true,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'create',
          path: '/:surveyId',
          verbs: ['post'],
        },
        resetInviteStatusSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            participantId: {
              required: true,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'resetInviteStatus',
          path: '/:surveyId/:participantId/reset-invite-status',
          verbs: ['put'],
        },
        resetReminderStatusSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            participantId: {
              required: true,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'resetReminderStatus',
          path: '/:surveyId/:participantId/reset-reminder-status',
          verbs: ['put'],
        },
        updateSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            participant: {
              required: true,
              src: 'body',
            },
            participantId: {
              required: true,
              src: 'param',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'update',
          path: '/:surveyId/:participantId',
          verbs: ['put'],
        },
      },
      path: '/survey-participant',
      service: 'surveyParticipant',
    })
  })

  it('surveyParticipantImport matches the previous hand-written config', () => {
    expect(
      projectEndpointConfig(surveyParticipantImportConfigGenerated),
    ).toEqual({
      enable: true,
      endpoints: {
        importSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            batchSize: {
              defaultValue: 500,
              required: false,
              src: 'body',
            },
            file: {
              required: true,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            response: {
              required: true,
              src: 'container',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'import',
          path: '/:surveyId/import',
          verbs: ['post'],
        },
      },
      path: '/survey-participant',
      service: 'surveyParticipantImport',
    })
  })

  it('surveyParticipantExport matches the previous hand-written config', () => {
    expect(
      projectEndpointConfig(surveyParticipantExportConfigGenerated),
    ).toEqual({
      enable: true,
      endpoints: {
        exportSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            ids: {
              required: false,
              src: 'query',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            response: {
              required: true,
              src: 'container',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'export',
          path: '/:surveyId/export',
          verbs: ['get'],
        },
      },
      path: '/survey-participant',
      service: 'surveyParticipantExport',
    })
  })

  it('surveyParticipantEmail matches the previous hand-written config', () => {
    expect(
      projectEndpointConfig(surveyParticipantEmailConfigGenerated),
    ).toEqual({
      enable: true,
      endpoints: {
        sendInvitesSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            batchSize: {
              defaultValue: 100,
              required: false,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            skip: {
              defaultValue: 0,
              required: false,
              src: 'body',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'send',
          path: '/:surveyId/send-invites',
          verbs: ['post'],
        },
        sendRemindersSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            batchSize: {
              defaultValue: 100,
              required: false,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            skip: {
              defaultValue: 0,
              required: false,
              src: 'body',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'sendReminders',
          path: '/:surveyId/send-reminders',
          verbs: ['post'],
        },
      },
      path: '/survey-participant',
      service: 'surveyParticipantEmail',
    })
  })

  it('surveyParticipantGenerate matches the previous hand-written config', () => {
    expect(
      projectEndpointConfig(surveyParticipantGenerateConfigGenerated),
    ).toEqual({
      enable: true,
      endpoints: {
        generateSurveyParticipant: {
          acl: [
            {
              allow: true,
              role: 'projectAdmin',
            },
          ],
          data: {
            count: {
              required: true,
              src: 'body',
            },
            projectId: {
              required: true,
              src: 'header',
              srcPath: 'X-Project-Id',
            },
            surveyId: {
              required: true,
              src: 'param',
            },
          },
          enable: true,
          errors: {},
          method: 'generate',
          path: '/:surveyId/generate',
          verbs: ['post'],
        },
      },
      path: '/survey-participant',
      service: 'surveyParticipantGenerate',
    })
  })
})
