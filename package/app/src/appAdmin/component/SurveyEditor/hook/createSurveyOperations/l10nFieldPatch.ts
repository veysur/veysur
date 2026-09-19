/**
 * Build the patch value for a translatable (L10n) field edit.
 *
 * The merge-based patch applier treats an empty object as "no change", so an
 * emptied *secondary*-language value must be sent as an explicit `null` to unset
 * that language key. The default language keeps `""` (a real value the user set).
 */
export const l10nFieldPatchValue = <T>(
  current: T,
  newValue: string,
  lang: string,
  langDefault: string | undefined,
): T | Record<string, unknown> => {
  const isSecondaryLangDeletion =
    newValue === '' && langDefault !== undefined && lang !== langDefault
  return isSecondaryLangDeletion
    ? { ...(current as object), [lang]: null }
    : current
}
