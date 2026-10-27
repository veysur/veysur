// cspell:ignore apos quot
function decodeHTMLEntities(text: string) {
  const entities = [
    ['amp', '&'],
    ['apos', "'"],
    ['#x27', "'"],
    ['#x2F', '/'],
    ['#39', "'"],
    ['#47', '/'],
    ['lt', '<'],
    ['gt', '>'],
    ['nbsp', ' '],
    ['quot', '"'],
  ]

  for (let i = 0, max = entities.length; i < max; ++i)
    text = text.replace(
      new RegExp('&' + entities[i][0] + ';', 'g'),
      entities[i][1],
    )

  return text
}

/**
 * Strips HTML tags from a string, leaving only the plain text.
 * Allows specifying an array of tag names to keep.
 *
 * @param html - The HTML string to strip tags from
 * @param allowedTags - An optional array of tag names to allow (default: [])
 * @returns The input string with HTML tags removed, except for allowed tags
 */
export function stripHtml(value: string, allowedTags: string[] = []): string {
  value = decodeHTMLEntities(value)
  // Create a regular expression that matches all HTML tags
  // except for the allowed ones
  const tagsRegex = new RegExp(
    `<(?!\\/?(?:${allowedTags.join('|')})(?:\\s|>))/?[^>]+>`,
    'gi',
  )

  // The regex needs a closing `>`, so nothing after the last one can match.
  // Without the cut, every unclosed `<` rescans to the end of the string,
  // which is quadratic on input such as `<<<<...`.
  const cut = value.lastIndexOf('>') + 1
  value = value.slice(0, cut).replace(tagsRegex, ' ') + value.slice(cut)

  // Remove extra whitespace and trim the result
  value = value.replace(/\s+/g, ' ').trim()

  return value
}
