import { Schema, sb } from '@datacapy/schema'

import {
  ALL_CHART_TYPES,
  ALL_CHART_VALUE_MODES,
} from '../constructor/SettingSurvey/SettingSurveyBase'

export class SchemaSettingSurvey extends Schema {
  constructor() {
    super(
      sb
        .schema('settingSurvey')
        .construct('SettingSurvey')
        .strict()
        .shape({
          _id: sb.string().required(),
          welcome: {
            message: { $schema: 'l10nHtml' },
          },
          thankYou: {
            message: { $schema: 'l10nHtml' },
            link: {
              url: { $schema: 'l10nUrl' },
              text: { $schema: 'l10n' },
            },
          },
          language: {
            default: sb.string().required().default('en'),
            options: sb
              .array()
              .required()
              .notEmpty()
              .of(sb.string())
              .default(['en']),
          },
          presentation: {
            format: sb
              .string()
              .inArray(['group', 'question', 'all'])
              .default(null),
            // Show no-answer option for non-mandatory questions
            // - is purely a UI feature has no effect on survey navigation
            noAnswer: sb.boolean().default(null),
            title: sb.boolean().default(null),
            welcomeMessage: sb.boolean().default(null),
            progressBar: sb.boolean().default(null),
            questionCount: sb.boolean().default(null),
            groupName: sb.boolean().default(null),
            groupDesc: sb.boolean().default(null),
            questionNum: sb.boolean().default(null),
            questionCode: sb.boolean().default(null),
            questionIndex: sb.boolean().default(null),
            // can users navigate backwards and change their answers
            backNav: sb.boolean().default(null),
            // end url becomes redirect URL
            redirectEnd: sb.boolean().default(null),
            // seconds before nav links / buttons are active
            navDelay: sb.number().default(null),
            // allow printing answers at the end of the survey
            print: sb.boolean().default(null),
            stats: sb.boolean().default(null),
            // remove Veysur branding from the survey UI (requires NOBRAND plan feature)
            noBrand: sb.boolean().default(null),
            // show the End URL link on the thank you page, independent of language
            thankYouLink: sb.boolean().default(null),
          },
          participant: {
            htmlEmail: sb.boolean().default(null),
            // Send participant a confirmation email after they complete the survey
            thankYouEmail: sb.boolean().default(null),
            tokenLength: sb.number().default(null),
          },
          data: {
            // Track data submit time
            timestamp: sb.boolean().default(null),
            // Track ip address
            ip: sb.boolean().default(null),
            // When tracking ip zero-out the least significant part
            anonymiseIp: sb.boolean().default(null),
            referrerUrl: sb.boolean().default(null),
            // Track time on each page
            timings: sb.boolean().default(null),
            assessment: sb.boolean().default(null),
          },
          access: {
            // Participant-id and response started / completed times are not recorded
            // - so there is no way to link the response to a participant
            // - participant token usage tracked separately from response data
            anonymous: sb.boolean().default(null),
            // Any visitor to the survey can provide a response
            // - no registration is required and no email invitation sent
            // Defaults to false, surveys are usually closed
            open: sb.boolean().default(null),
            // An unregistered visitor can register their name/email
            // - adding them as a participant and sending them a token via email
            // Defaults to false
            // - in which case, registration is not possible,
            //  regardless of whether the survey is open or closed
            // When true
            // - registration required for participating in an open survey
            //  unless you already have a participant token
            // - closed survey accessible via public registration
            publicReg: sb.boolean().default(null),
            // List on home page
            index: sb.boolean().default(null),
            // Participant can resume by returning with same token
            // - not applicable to anonymous survey because there is no link
            // - between token and response data
            tokenPersist: sb.boolean().default(null),
            // Allow multiple responses from one token
            multiple: sb.boolean().default(null),
            // Use cookie to prevent repeat submissions
            repeatCookie: sb.boolean().default(null),
            // Allow participant to resume survey after leaving the page
            // - using a provided link with a resume-token
            // - (different from a participant token)
            // Resume-token is associated with the response but not participant
            // Participant may optionally have the link emailed to them
            // Works with anonymous surveys because we do not store the
            // - provided email address
            // Working with open surveys when not requiring registration
            resumeLink: sb.boolean().default(null),
            // Captcha for survey access
            captcha: sb.boolean().default(null),
            // Captcha for public registration
            captchaReg: sb.boolean().default(null),
            // Captcha for survey resumption
            captchaResume: sb.boolean().default(null),
          },
          schedule: {
            start: sb.date().default(null),
            end: sb.date().default(null),
          },
          contentFormat: {
            // Raw HTML authoring/rendering permitted (when markdown is off)
            htmlAllowed: sb.boolean().default(null),
            // Markdown authoring/rendering permitted
            markdownAllowed: sb.boolean().default(null),
            // Sanitizer permits <script> tags through - dangerous, explicit opt-in
            scriptTagsAllowed: sb.boolean().default(null),
          },
          dataPolicy: {
            show: sb.boolean().default(null),
            link: sb.boolean().default(null),
            text: { $schema: 'l10nHtml' },
            url: { $schema: 'l10nUrl' },
          },
          legalNotice: {
            show: sb.boolean().default(null),
            link: sb.boolean().default(null),
            text: { $schema: 'l10nHtml' },
            url: { $schema: 'l10nUrl' },
          },
          // Who to notify when participant completes survey
          notify: {
            // Semicolon ; separated recipient string
            // - recipient can be an email address or a {{...}} placeholder
            // -- project owner email {{projectOwner.email}}
            // -- participant email (for none anonymous surveys) {{participant.email}}
            // -- participant attribute  {{participant.someEmail}}
            // -- answer value (by question code reference) {{response.QUESTION_CODE}}
            basic: String,
            detailed: String,
          },
          stats: {
            questions: sb.object().matchAll(
              sb.object({
                chartType: sb.string().inArray(ALL_CHART_TYPES),
                valueMode: sb.string().inArray(ALL_CHART_VALUE_MODES),
              }),
            ),
          },
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}
