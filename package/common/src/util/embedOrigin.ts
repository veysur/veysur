// An empty list allows any website. Otherwise an entry matches its own hostname
// and any subdomain.
export function isEmbedOriginAllowed(
  embedOrigin: string,
  embedDomains: string[] | null | undefined,
): boolean {
  if (!embedDomains?.length) {
    return true
  }

  let hostname: string
  try {
    hostname = new URL(embedOrigin).hostname.toLowerCase()
  } catch {
    return false
  }

  return embedDomains.some((domain) => {
    const allowed = domain.trim().toLowerCase()
    return (
      allowed !== '' &&
      (hostname === allowed || hostname.endsWith(`.${allowed}`))
    )
  })
}

// Accepts what people paste (hostnames, URLs, one per line or comma separated)
// and keeps only lower-case, de-duplicated hostnames.
export function parseEmbedDomains(text: string): string[] {
  const hostnames = text
    .split(/[\s,;]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry && !entry.includes('*'))
    .map((entry) => {
      try {
        return new URL(entry.includes('://') ? entry : `https://${entry}`)
          .hostname
      } catch {
        return ''
      }
    })
    .filter(Boolean)

  return Array.from(new Set(hostnames))
}
