// Strips the "CUS-<userId>-" prefix the backend prepends for gap-free
// sequential numbering (see ServiceInvoice._nextDocumentNumber). The full
// string remains the legal document number on PDFs and for support lookups
// — only the displayed label is shortened.
export function shortenDocumentCode(code: string | null | undefined): string {
  if (!code) return ''
  const match = code.match(/^CUS-.+-((?:INV|CN)-\d+)$/)
  return match ? match[1] : code
}
