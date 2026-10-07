/**
 * Builds a query matching every whitespace-separated token in `search` against
 * at least one of `fields` (AND across tokens, OR across fields per token).
 * This lets a full-name search like "John Smith" match records where the
 * tokens are split across separate fields (e.g. nameFirst/nameLast), which a
 * single regex tested against each field independently cannot do.
 */
export function buildMultiFieldSearchQuery(
  search: string,
  fields: string[],
): Record<string, unknown> {
  const tokens = search.split(/\s+/).filter((token) => token.length > 0)

  return {
    $and: tokens.map((token) => ({
      $or: fields.map((field) => ({
        [field]: { $regex: token, $options: 'i' },
      })),
    })),
  }
}
