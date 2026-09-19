import { User } from './User'
import { UserEmailMeta } from './UserEmailMeta'

describe('User', () => {
  let user: User

  beforeEach(() => {
    user = new User({
      nameFirst: 'John',
      nameLast: 'Doe',
      email: 'john.doe@example.com',
      emailMeta: new UserEmailMeta(),
      role: 'customer',
    })
  })

  test('constructor initializes properties correctly', () => {
    expect(user.nameFirst).toBe('John')
    expect(user.nameLast).toBe('Doe')
    expect(user.email).toBe('john.doe@example.com')
    expect(user.emailMeta).toBeInstanceOf(UserEmailMeta)
    expect(user.role).toBe('customer')
  })

  test('getFullName returns the full name', () => {
    expect(user.getFullName()).toBe('John Doe')
  })

  test('getShortName returns the short name', () => {
    expect(user.getShortName()).toBe('John D')
  })

  test('getInitials returns correct initials', () => {
    expect(user.getInitials()).toBe('JD')
  })

  test('getInitials handles missing last name', () => {
    user.nameLast = ''
    expect(user.getInitials()).toBe('J')
  })

  test('getInitials handles missing first name', () => {
    user.nameFirst = ''
    expect(user.getInitials()).toBe('D')
  })

  test('getInitials handles missing both names', () => {
    user.nameFirst = ''
    user.nameLast = ''
    expect(user.getInitials()).toBe('')
  })

  test('hasRole returns true for matching role', () => {
    expect(user.hasRole('customer')).toBe(true)
  })

  test('hasRole returns false for non-matching role', () => {
    expect(user.hasRole('admin')).toBe(false)
  })

  test('hasRole handles array of roles', () => {
    expect(user.hasRole(['admin', 'customer'])).toBe(true)
    expect(user.hasRole(['admin', 'manager'])).toBe(false)
  })
})
