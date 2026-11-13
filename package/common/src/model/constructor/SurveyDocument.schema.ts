// Generated from SurveyDocument.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema, SpecFor } from '@datacapy/schema'
import type { SurveyDocument } from './SurveyDocument'
import { SchemaSurveySection } from '../schema/SchemaSurveySection'
import { SchemaSurveyElement } from '../schema/SchemaSurveyElement'
import { SchemaL10nHtml } from '../schema/SchemaL10nHtml'
import { SchemaL10nUrl } from '../schema/SchemaL10nUrl'
import { SchemaL10n } from '../schema/SchemaL10n'
import type {
  L10nData,
  L10nHtmlData,
  L10nUrlData,
  SurveyElementDocument,
  SurveySectionDocument,
} from './EmbeddedSchemaData'

export class SchemaSurvey extends Schema.from(
  sb
    .schema('survey')
    .construct('Survey')
    .strict()
    .shape({
      createdById: sb.string().required(),
      name: sb.string().default('').label('Name').trim().stripHtml(),
      title: sb
        .object()
        .matchAll(sb.string().maxLength(255).label('Title').trim().stripHtml())
        .default({})
        .construct('L10n'),
      attributes: sb.object().as<Record<string, unknown>>().default({}),
      sectionIds: sb.array(sb.string().required()).default([]),
      elementIds: sb.array(sb.string().required()).default([]),
      sections: sb.array(
        sb
          .refTo<SpecFor<SurveySectionDocument>>(
            (): unknown => new SchemaSurveySection(),
          )
          .required(),
      ),
      elements: sb.array(
        sb
          .refTo<SpecFor<SurveyElementDocument>>(
            (): unknown => new SchemaSurveyElement(),
          )
          .required(),
      ),
      _id: sb.string().required(),
      welcome: sb.object({
        message: sb.refTo<SpecFor<L10nHtmlData>>(
          (): unknown => new SchemaL10nHtml(),
        ),
      }),
      thankYou: sb.object({
        message: sb.refTo<SpecFor<L10nHtmlData>>(
          (): unknown => new SchemaL10nHtml(),
        ),
        link: sb.object({
          url: sb.refTo<SpecFor<L10nUrlData>>(
            (): unknown => new SchemaL10nUrl(),
          ),
          text: sb.refTo<SpecFor<L10nData>>((): unknown => new SchemaL10n()),
        }),
      }),
      language: sb.object({
        default: sb.string().required().default('en'),
        options: sb
          .array(sb.string().required())
          .required()
          .default(['en'])
          .notEmpty(),
      }),
      presentation: sb.object({
        format: sb.string().default(null).inArray(['group', 'question', 'all']),
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
        backNav: sb.boolean().default(null),
        redirectEnd: sb.boolean().default(null),
        navDelay: sb.number().default(null),
        print: sb.boolean().default(null),
        stats: sb.boolean().default(null),
        noBrand: sb.boolean().default(null),
        thankYouLink: sb.boolean().default(null),
      }),
      participant: sb.object({
        htmlEmail: sb.boolean().default(null),
        thankYouEmail: sb.boolean().default(null),
        tokenLength: sb.number().default(null),
      }),
      data: sb.object({
        timestamp: sb.boolean().default(null),
        ip: sb.boolean().default(null),
        anonymiseIp: sb.boolean().default(null),
        referrerUrl: sb.boolean().default(null),
        timings: sb.boolean().default(null),
        assessment: sb.boolean().default(null),
      }),
      access: sb.object({
        anonymous: sb.boolean().default(null),
        open: sb.boolean().default(null),
        publicReg: sb.boolean().default(null),
        index: sb.boolean().default(null),
        tokenPersist: sb.boolean().default(null),
        multiple: sb.boolean().default(null),
        preventRepeat: sb.boolean().default(null),
        resumeLink: sb.boolean().default(null),
        botProtection: sb.boolean().default(null),
        embed: sb.boolean().default(null),
        embedDomains: sb.array(sb.string().required()).default(null),
      }),
      schedule: sb.object({
        start: sb.date().default(null),
        end: sb.date().default(null),
      }),
      contentFormat: sb.object({
        htmlAllowed: sb.boolean().default(null),
        markdownAllowed: sb.boolean().default(null),
        scriptTagsAllowed: sb.boolean().default(null),
      }),
      dataPolicy: sb.object({
        show: sb.boolean().default(null),
        link: sb.boolean().default(null),
        text: sb.refTo<SpecFor<L10nHtmlData>>(
          (): unknown => new SchemaL10nHtml(),
        ),
        url: sb.refTo<SpecFor<L10nUrlData>>((): unknown => new SchemaL10nUrl()),
      }),
      legalNotice: sb.object({
        show: sb.boolean().default(null),
        link: sb.boolean().default(null),
        text: sb.refTo<SpecFor<L10nHtmlData>>(
          (): unknown => new SchemaL10nHtml(),
        ),
        url: sb.refTo<SpecFor<L10nUrlData>>((): unknown => new SchemaL10nUrl()),
      }),
      notify: sb.object({ basic: sb.string(), detailed: sb.string() }),
      stats: sb.object({
        questions: sb
          .object()
          .matchAll(
            sb.object({
              chartType: sb
                .string()
                .inArray([
                  'bar',
                  'horizontalBar',
                  'pie',
                  'stackedBar',
                  'pieGrid',
                  'averageRank',
                ]),
              valueMode: sb.string().inArray(['count', 'percentage']),
            }),
          ),
      }),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaSurvey: AssertSchema<SchemaSurvey, SurveyDocument> = true
void _checkSchemaSurvey
