export function pickEmbedLanguage(
  requested: string | undefined,
  browserLanguages: readonly string[],
  languages: string[],
  defaultLanguage: string | null,
): string {
  const wanted = [
    requested,
    ...browserLanguages.flatMap((lang) => [lang, lang.split('-')[0]]),
    defaultLanguage,
  ]
  const match = wanted.find((lang) => lang && languages.includes(lang))
  return match || languages[0]
}
