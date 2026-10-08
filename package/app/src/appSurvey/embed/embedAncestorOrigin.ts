export const EMBED_ORIGIN_UNKNOWN = 'unknown'

// Reported to the API so it can check the embedding site. Always returns a
// value: omitting the header would let a host page skip the check by sending
// no referrer, whereas 'unknown' fails any allowed-domains list.
export function getEmbedAncestorOrigin(
  ancestorOrigins: ArrayLike<string> | undefined,
  referrer: string,
): string {
  const parent = ancestorOrigins?.[0]
  if (parent && parent !== 'null') {
    return parent
  }

  try {
    return referrer ? new URL(referrer).origin : EMBED_ORIGIN_UNKNOWN
  } catch {
    return EMBED_ORIGIN_UNKNOWN
  }
}
