// cspell:ignore youtu

export interface ParsedYoutube {
  videoId: string
  startAt: number | null
}

const VIDEO_ID_PATTERN = /^[\w-]{11}$/
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

/**
 * Parse a YouTube watch / short / embed URL into a video id and optional start
 * offset in whole seconds. Returns `null` for anything that is not recognisably
 * a YouTube URL carrying an 11-character video id.
 *
 * Accepts: `youtu.be/<id>`, `youtube.com/watch?v=<id>`, `youtube.com/embed/<id>`,
 * `youtube-nocookie.com/embed/<id>`, `m.youtube.com/...`, with or without a
 * protocol. Start offset is read from `?start=`, `&t=` or `#t=` and supports the
 * `1m30s` / `90s` / `90` forms.
 */
export function parseYoutubeUrl(
  url: string | null | undefined,
): ParsedYoutube | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withProtocol)
  } catch {
    return null
  }

  const host = parsed.hostname.toLowerCase()
  let videoId: string | null = null

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null
  } else if (YOUTUBE_HOSTS.has(host)) {
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments[0] === 'watch') {
      videoId = parsed.searchParams.get('v')
    } else if (segments[0] === 'embed' || segments[0] === 'shorts') {
      videoId = segments[1] ?? null
    }
  } else {
    return null
  }

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) return null

  const startRaw =
    parsed.searchParams.get('start') ??
    parsed.searchParams.get('t') ??
    readHashTime(parsed.hash)

  return { videoId, startAt: parseStart(startRaw) }
}

function readHashTime(hash: string): string | null {
  const match = /(?:^#|[?&])t=([^&]+)/.exec(hash)
  return match ? match[1] : null
}

function parseStart(value: string | null): number | null {
  if (!value) return null
  if (/^\d+$/.test(value)) return Number(value)
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i.exec(value)
  if (!match || (!match[1] && !match[2] && !match[3])) return null
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  return hours * 3600 + minutes * 60 + seconds
}
