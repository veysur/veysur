import { ImportSectionEntity } from 'veysur-common'

/**
 * A section no longer holds `elementIds`: membership is each element's
 * `sectionId` and order is `survey.elementIds`. Older import files, the
 * markdown parser and the ID translator still carry the key, and the strict
 * section schema rejects it. Remove this helper once none of them emit it.
 */
export function importSectionFields<T extends ImportSectionEntity>(
  section: T,
): Omit<T, 'elementIds'> {
  const fields = { ...section }
  delete fields.elementIds
  return fields
}
