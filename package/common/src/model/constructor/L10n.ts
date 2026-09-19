export class L10n {
  [key: string]: string | ((this: L10n, ...args: never[]) => unknown)

  constructor(data = {}) {
    Object.assign(this, data)
  }

  getLang(languageCode: string, defaultLanguageCode: string = 'en'): string {
    return ([this[languageCode], this[defaultLanguageCode]].find(
      (value) => value || value === '',
    ) || '') as string
  }

  getLangOrNull(
    languageCode: string,
    defaultLanguageCode: string = 'en',
  ): string | null {
    const found = [this[languageCode], this[defaultLanguageCode]].find(
      (value) => value || value === '',
    ) as string | undefined
    return found === '' ? '' : found || null
  }

  setLang(
    text: string,
    languageCode: string,
    options?: { unset?: boolean },
  ): L10n {
    const l10n = new L10n({
      ...this,
      [languageCode]: text,
    })
    if ((text === '' || text === null) && (options?.unset ?? true)) {
      return l10n.unsetLang(languageCode)
    }
    return l10n
  }

  unsetLang(languageCode: string): L10n {
    const l10n = new L10n({ ...this })
    delete l10n[languageCode]
    return l10n
  }
}

/**
 * Apply a translatable-field edit, creating the L10n if absent.
 *
 * An emptied *secondary* language removes its key; an emptied default language is
 * stored as `""`. Callers pass `defaultLanguage` from the survey config.
 */
export const setL10nField = (
  current: L10n | null | undefined,
  value: string,
  language: string,
  defaultLanguage?: string,
): L10n =>
  (current ?? new L10n()).setLang(value, language, {
    unset: language !== defaultLanguage,
  })

export default L10n
