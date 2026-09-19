import { checkSystemAttributeCollisions } from './checkSystemAttributeCollisions'

describe('checkSystemAttributeCollisions', () => {
  const existingAttributes = [
    { name: 'department' },
    { name: 'region' },
    { name: 'costCentre' },
  ]

  test('returns empty when no candidate name collides with existing custom attributes', () => {
    const result = checkSystemAttributeCollisions(
      ['newField'],
      existingAttributes,
    )
    expect(result).toEqual([])
  })

  test('returns collisions when a candidate name matches an existing custom attribute', () => {
    const result = checkSystemAttributeCollisions(
      ['department'],
      existingAttributes,
    )
    expect(result).toEqual([{ name: 'department' }])
  })

  test('returns multiple collisions when several candidates match', () => {
    const result = checkSystemAttributeCollisions(
      ['department', 'region', 'unknownField'],
      existingAttributes,
    )
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.name)).toEqual(
      expect.arrayContaining(['department', 'region']),
    )
  })

  test('does not flag system attribute names as collisions (they are expected to coexist)', () => {
    // System attributes (nameFirst, email, etc.) are never stored as custom attributes,
    // but even if a candidate name matches a system name, the collision scan is about
    // custom records — not system names themselves.
    const withSystemName = [{ name: 'email' }, { name: 'department' }]
    // 'email' is both a system attribute AND in the list — the scan ignores system names
    const result = checkSystemAttributeCollisions(
      ['email', 'department'],
      withSystemName,
    )
    // 'email' is a system attribute, not a custom one — excluded
    // 'department' is a custom attribute — included
    expect(result).toEqual([{ name: 'department' }])
  })

  test('returns empty for an empty candidate list', () => {
    const result = checkSystemAttributeCollisions([], existingAttributes)
    expect(result).toEqual([])
  })
})
