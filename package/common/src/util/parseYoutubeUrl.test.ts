// cspell:ignore youtu
import { parseYoutubeUrl } from './parseYoutubeUrl'

describe('parseYoutubeUrl', () => {
  const ID = 'dQw4w9WgXcQ'

  it.each([
    [`https://youtu.be/${ID}`, ID, null],
    [`youtu.be/${ID}`, ID, null],
    [`https://www.youtube.com/watch?v=${ID}`, ID, null],
    [`http://youtube.com/watch?v=${ID}&feature=share`, ID, null],
    [`https://m.youtube.com/watch?v=${ID}`, ID, null],
    [`https://www.youtube.com/embed/${ID}`, ID, null],
    [`https://www.youtube-nocookie.com/embed/${ID}`, ID, null],
    [`https://www.youtube.com/shorts/${ID}`, ID, null],
  ])('parses %s', (url, videoId, startAt) => {
    expect(parseYoutubeUrl(url)).toEqual({ videoId, startAt })
  })

  it.each([
    [`https://youtu.be/${ID}?t=90`, 90],
    [`https://www.youtube.com/watch?v=${ID}&t=1m30s`, 90],
    [`https://www.youtube.com/watch?v=${ID}&start=42`, 42],
    [`https://www.youtube.com/embed/${ID}?start=1h2m3s`, 3723],
    [`https://youtu.be/${ID}#t=15`, 15],
  ])('reads the start offset from %s', (url, startAt) => {
    expect(parseYoutubeUrl(url)).toEqual({ videoId: ID, startAt })
  })

  it.each([
    null,
    undefined,
    '',
    '   ',
    'not a url',
    'https://vimeo.com/123456',
    'https://www.youtube.com/watch?v=tooShort',
    'https://www.youtube.com/',
    `https://example.com/embed/${ID}`,
  ])('returns null for %s', (input) => {
    expect(parseYoutubeUrl(input as string)).toBeNull()
  })
})
