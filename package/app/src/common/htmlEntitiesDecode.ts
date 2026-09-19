export function decodeHTMLEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#39;': "'",
    '&#47;': '/',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&quot;': '"',
  }
  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity)
}
