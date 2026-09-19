import { resolveNotifyRecipients } from './resolveNotifyRecipients'
import { TemplateContext } from 'veysur-common'

const emptyContext: TemplateContext = {
  participant: {},
  answers: {},
}

describe('resolveNotifyRecipients', () => {
  test('returns an empty array for null/undefined/empty input', () => {
    expect(resolveNotifyRecipients(null, emptyContext)).toEqual([])
    expect(resolveNotifyRecipients(undefined, emptyContext)).toEqual([])
    expect(resolveNotifyRecipients('', emptyContext)).toEqual([])
  })

  test('splits on semicolons and trims whitespace, dropping empty tokens', () => {
    const result = resolveNotifyRecipients(
      ' admin@example.com ; ; manager@example.com;',
      emptyContext,
    )
    expect(result).toEqual(['admin@example.com', 'manager@example.com'])
  })

  test('drops invalid literal email addresses', () => {
    const result = resolveNotifyRecipients(
      'not-an-email;admin@example.com',
      emptyContext,
    )
    expect(result).toEqual(['admin@example.com'])
  })

  describe('{{projectOwner.email}}', () => {
    test('resolves when present', () => {
      const result = resolveNotifyRecipients('{{projectOwner.email}}', {
        ...emptyContext,
        projectOwner: { email: 'owner@example.com' },
      })
      expect(result).toEqual(['owner@example.com'])
    })

    test('omitted when projectOwner is absent from the context', () => {
      const result = resolveNotifyRecipients(
        '{{projectOwner.email}}',
        emptyContext,
      )
      expect(result).toEqual([])
    })
  })

  describe('{{participant.email}}', () => {
    test('resolves to the participant email when present', () => {
      const result = resolveNotifyRecipients('{{participant.email}}', {
        ...emptyContext,
        participant: { email: 'jane@example.com' },
      })
      expect(result).toEqual(['jane@example.com'])
    })

    test('omitted when participant.email is null (anonymous survey gate)', () => {
      const result = resolveNotifyRecipients('{{participant.email}}', {
        ...emptyContext,
        participant: { email: null },
      })
      expect(result).toEqual([])
    })
  })

  describe('{{participant.<name>}}', () => {
    test('resolves case-insensitively', () => {
      const result = resolveNotifyRecipients('{{participant.MANAGER_EMAIL}}', {
        ...emptyContext,
        participant: { manager_email: 'boss@example.com' },
      })
      expect(result).toEqual(['boss@example.com'])
    })

    test('omitted when attribute missing', () => {
      const result = resolveNotifyRecipients('{{participant.missing}}', {
        ...emptyContext,
        participant: { other: 'x@example.com' },
      })
      expect(result).toEqual([])
    })

    test('omitted when attribute value is not an email', () => {
      const result = resolveNotifyRecipients('{{participant.department}}', {
        ...emptyContext,
        participant: { DEPARTMENT: 'Sales' },
      })
      expect(result).toEqual([])
    })
  })

  describe('{{answers.<questionCode>}}', () => {
    test('resolves from answers keyed by question code', () => {
      const result = resolveNotifyRecipients('{{answers.MANAGER_EMAIL}}', {
        ...emptyContext,
        answers: { MANAGER_EMAIL: 'reviewer@example.com' },
      })
      expect(result).toEqual(['reviewer@example.com'])
    })

    test('omitted when answer missing', () => {
      const result = resolveNotifyRecipients(
        '{{answers.MISSING}}',
        emptyContext,
      )
      expect(result).toEqual([])
    })

    test('omitted when answer is not a string (array/object answer types)', () => {
      const result = resolveNotifyRecipients('{{answers.MULTI}}', {
        ...emptyContext,
        answers: { MULTI: ['a@example.com', 'b@example.com'] },
      })
      expect(result).toEqual([])
    })
  })

  test('unrecognized placeholder syntax is silently dropped, no throw', () => {
    expect(() =>
      resolveNotifyRecipients('{{unknown.thing}}', emptyContext),
    ).not.toThrow()
    expect(resolveNotifyRecipients('{{unknown.thing}}', emptyContext)).toEqual(
      [],
    )
    // Old single-brace syntax is no longer recognized as a placeholder at all
    // - it's treated as a literal (invalid) email address and dropped.
    expect(resolveNotifyRecipients('{UNKNOWN_THING}', emptyContext)).toEqual([])
  })

  test('deduplicates across mixed literal and placeholder tokens (case-insensitive)', () => {
    const result = resolveNotifyRecipients(
      'admin@example.com;{{projectOwner.email}};ADMIN@EXAMPLE.COM',
      { ...emptyContext, projectOwner: { email: 'admin@example.com' } },
    )
    expect(result).toEqual(['admin@example.com'])
  })

  test('mixed successful and unresolvable tokens resolve independently', () => {
    const result = resolveNotifyRecipients(
      'manager@example.com;{{participant.email}};{{answers.QUESTION_CODE}}',
      {
        ...emptyContext,
        participant: { email: null },
        answers: {},
      },
    )
    expect(result).toEqual(['manager@example.com'])
  })
})
