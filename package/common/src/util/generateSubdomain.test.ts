import { generateSubdomain, subdomainCandidates } from './generateSubdomain'
import { validateSubdomainPrefix } from './subdomain-validator'

describe('generateSubdomain', () => {
  it('turns an ordinary name into a slug', () => {
    expect(generateSubdomain('My Study 2')).toBe('my-study-2')
  })

  it('strips leading digits and punctuation', () => {
    expect(generateSubdomain('2024 Customer Survey!')).toBe('customer-survey')
  })

  it('suffixes a reserved word instead of returning it', () => {
    expect(generateSubdomain('Test')).toBe('test-project')
  })

  it('suffixes a name that is too short', () => {
    expect(generateSubdomain('Ab')).toBe('ab-project')
  })

  it('returns empty when nothing usable remains', () => {
    expect(generateSubdomain('2024')).toBe('')
    expect(generateSubdomain('日本語')).toBe('')
    expect(generateSubdomain('')).toBe('')
  })

  it('keeps a very long name within the DNS label limit and valid', () => {
    const result = generateSubdomain(`${'long-name '.repeat(20)}x`)
    expect(result.length).toBeLessThanOrEqual(50)
    expect(validateSubdomainPrefix(result)).toBe(true)
  })
})

describe('subdomainCandidates', () => {
  it('lists the suggestion then numbered variants', () => {
    expect(subdomainCandidates('My Study', 4)).toEqual([
      'my-study',
      'my-study-2',
      'my-study-3',
      'my-study-4',
    ])
  })

  it('returns only valid prefixes even at the maximum base length', () => {
    for (const candidate of subdomainCandidates('x'.repeat(80))) {
      expect(validateSubdomainPrefix(candidate)).toBe(true)
      expect(candidate.length).toBeLessThanOrEqual(63)
    }
  })

  it('is empty when the name has no usable characters', () => {
    expect(subdomainCandidates('日本語')).toEqual([])
  })
})
