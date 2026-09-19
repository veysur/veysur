import { buildTemplateContext } from './TemplateContext'

describe('buildTemplateContext', () => {
  it('always includes participant and answers containers', () => {
    const context = buildTemplateContext({})
    expect(context.participant).toEqual({})
    expect(context.answers).toEqual({})
  })

  it('merges participant profile fields via mergeParticipantData', () => {
    const context = buildTemplateContext({
      participant: { nameFirst: 'John', email: 'john@example.com' },
    })
    expect(context.participant.nameFirst).toBe('John')
    expect(context.participant.email).toBe('john@example.com')
  })

  it('passes answers through as-is', () => {
    const context = buildTemplateContext({ answers: { Q001: 'Liverpool' } })
    expect(context.answers).toEqual({ Q001: 'Liverpool' })
  })

  it('omits optional containers when not provided', () => {
    const context = buildTemplateContext({})
    expect(context.projectOwner).toBeUndefined()
    expect(context.survey).toBeUndefined()
    expect(context.project).toBeUndefined()
  })

  it('includes projectOwner only when an email is given', () => {
    const withOwner = buildTemplateContext({
      projectOwnerEmail: 'owner@example.com',
    })
    expect(withOwner.projectOwner).toEqual({ email: 'owner@example.com' })

    const withoutOwner = buildTemplateContext({ projectOwnerEmail: null })
    expect(withoutOwner.projectOwner).toBeUndefined()
  })

  it('includes survey and project when provided', () => {
    const context = buildTemplateContext({
      survey: { name: 'My Survey', link: 'https://survey.example.com' },
      project: { name: 'My Project' },
    })
    expect(context.survey).toEqual({
      name: 'My Survey',
      link: 'https://survey.example.com',
    })
    expect(context.project).toEqual({ name: 'My Project' })
  })
})
