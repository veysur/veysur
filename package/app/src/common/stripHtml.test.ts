import { stripHtml } from './stripHtml'

describe('stripHtml', () => {
  describe('unclosed and malformed tags', () => {
    it.each([
      ['<scr<script>ipt>alert(1)', [], 'ipt>alert(1)'],
      ['a<b<c>d', [], 'a d'],
      ['<>', [], '<>'],
      ['x</', [], 'x</'],
      ['a < b > c', [], 'a < b > c'],
      ['&lt;script&gt;alert(1)&lt;/script&gt;', [], 'alert(1)'],
      ['<p>Hi</p> tail <b', [], 'Hi tail <b'],
      ['<b>bold</b> <i>it</i>', ['b'], '<b>bold</b> it'],
      ['<b <b <b>x', ['b'], '<b <b <b>x'],
      ['no tags at all >', [], 'no tags at all >'],
      ['<<<>>>', [], '>>'],
      ['a>b<c', ['b'], 'a>b<c'],
    ])(
      'should strip %j with allowed tags %j to %j',
      (input, allowedTags, expected) => {
        expect(stripHtml(input, allowedTags)).toBe(expected)
      },
    )

    it('should leave text after the last > untouched', () => {
      expect(stripHtml('<p>Hi</p> a < b <c')).toBe('Hi a < b <c')
    })
  })

  describe('linear-time behaviour', () => {
    const size = 200000
    const limitMs = 1000

    it.each([
      ['only <', '<'.repeat(size)],
      ['<a repeated with no >', '<a'.repeat(size / 2)],
      ['a > followed by only <', '>' + '<'.repeat(size)],
    ])('should not take quadratic time on %s', (_label, input) => {
      const start = Date.now()
      stripHtml(input)
      expect(Date.now() - start).toBeLessThan(limitMs)
    })
  })
})
