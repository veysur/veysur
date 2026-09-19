import { Survey, Patch } from 'veysur-common'

import { createSurveyCompleteOperations } from './surveyThankYouOperations'

describe('Survey Thank You Operations', () => {
  let surveyState: Survey
  let patchBuffer: Patch[]
  let operations: ReturnType<typeof createSurveyCompleteOperations>

  beforeEach(() => {
    surveyState = new Survey({
      _id: 'survey1',
      createdById: 'user1',
      sections: [
        {
          _id: 'THANKYOU',
          code: 'THANKYOU',
          kind: 'thankYou',
          desc: { en: 'Thanks' },
          config: {
            link: {
              url: { en: 'https://example.com', fr: 'https://example.fr' },
              text: { en: 'Go', fr: 'Aller' },
            },
          },
        },
      ],
    })
    patchBuffer = []

    const updateSurveyState = (updater: (s: Survey) => Survey) => {
      surveyState = updater(surveyState)
    }

    const validateAndBuffer = ({ patches }: { patches: Patch[] }) => {
      patchBuffer.push(...patches)
    }

    operations = createSurveyCompleteOperations({
      updateSurveyState,
      validateAndBuffer,
    } as never)
  })

  test('updateSurveyThankYouMessage buffers a thank-you section patch', () => {
    operations.updateSurveyThankYouMessage('All done', 'en')

    const patch = patchBuffer[0]
    expect(patch.type).toBe('section')
    expect(patch.id).toBe(surveyState.thankYouSection!._id)
    const data = patch.data as { kind: string; desc: Record<string, string> }
    expect(data.kind).toBe('thankYou')
    expect(data.desc.en).toBe('All done')
    expect(surveyState.thankYouSection?.desc?.en).toBe('All done')
  })

  test('updateSurveyThankYouLinkUrl sends an explicit null for a removed language', () => {
    operations.updateSurveyThankYouLinkUrl('', 'en')

    const patchData = patchBuffer[0].data as {
      config: { link: { url: Record<string, string | null> } }
    }
    expect(patchData.config.link.url).toEqual({
      en: null,
      fr: 'https://example.fr',
    })
    expect(surveyState.thankYouSection?.config?.link?.url?.en).toBeUndefined()
  })

  test('updateSurveyThankYouLinkText sends an explicit null for a removed language', () => {
    operations.updateSurveyThankYouLinkText('', 'fr')

    const patchData = patchBuffer[0].data as {
      config: { link: { text: Record<string, string | null> } }
    }
    expect(patchData.config.link.text).toEqual({
      en: 'Go',
      fr: null,
    })
  })

  test('clearSurveyThankYouLink buffers a link: null patch', () => {
    operations.clearSurveyThankYouLink()

    const patchData = patchBuffer[0].data as { config: { link: null } }
    expect(patchData.config.link).toBeNull()
    expect(surveyState.thankYouSection?.config?.link).toBeUndefined()
  })
})
