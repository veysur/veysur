import { resolveTemplate } from './resolveTemplate'
import { TemplateContext } from './TemplateContext'

describe('resolveTemplate', () => {
  const context: TemplateContext = {
    participant: { nameFirst: 'John', email: 'john@example.com' },
    answers: { Q001: 'Liverpool' },
    projectOwner: { email: 'owner@example.com' },
    survey: { name: 'My Survey', link: 'https://survey.example.com' },
    project: { name: 'My Project' },
  }

  it('returns the template unchanged when there is nothing to resolve', () => {
    expect(resolveTemplate('Hello world', context)).toBe('Hello world')
  })

  it('resolves participant tokens', () => {
    expect(resolveTemplate('Hi {{participant.nameFirst}}', context)).toBe(
      'Hi John',
    )
  })

  it('resolves answers tokens', () => {
    expect(resolveTemplate('You said {{answers.Q001}}', context)).toBe(
      'You said Liverpool',
    )
  })

  it('resolves survey/project/projectOwner tokens', () => {
    expect(
      resolveTemplate(
        '{{survey.name}} / {{survey.link}} / {{project.name}} / {{projectOwner.email}}',
        context,
      ),
    ).toBe(
      'My Survey / https://survey.example.com / My Project / owner@example.com',
    )
  })

  it('keeps an unresolvable token as literal text by default', () => {
    expect(resolveTemplate('{{participant.unknown}}', context)).toBe(
      '{{participant.unknown}}',
    )
  })

  it('drops an unresolvable token when onUnresolved is "drop"', () => {
    expect(
      resolveTemplate('x{{participant.unknown}}y', context, {
        onUnresolved: 'drop',
      }),
    ).toBe('xy')
  })

  it('resolves to nothing when a whole container is absent from the context', () => {
    const contextWithoutSurvey: TemplateContext = {
      participant: {},
      answers: {},
    }
    expect(
      resolveTemplate('{{survey.name}}', contextWithoutSurvey, {
        onUnresolved: 'drop',
      }),
    ).toBe('')
  })

  it('HTML-escapes resolved values by default', () => {
    const dangerousContext: TemplateContext = {
      participant: { nameFirst: '<script>alert(1)</script>' },
      answers: {},
    }
    expect(resolveTemplate('{{participant.nameFirst}}', dangerousContext)).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
  })

  it('does not escape resolved values when escape is "none"', () => {
    const dangerousContext: TemplateContext = {
      participant: { nameFirst: '<b>bold</b>' },
      answers: {},
    }
    expect(
      resolveTemplate('{{participant.nameFirst}}', dangerousContext, {
        escape: 'none',
      }),
    ).toBe('<b>bold</b>')
  })

  it('leaves literal template text untouched', () => {
    expect(
      resolveTemplate('<p>Hi {{participant.nameFirst}}!</p>', context),
    ).toBe('<p>Hi John!</p>')
  })
})
