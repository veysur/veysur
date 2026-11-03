import { SchemaConstructor } from '@datacapy/schema'

import { setL10nField } from '../L10n'
import { SchemaSurveyAnswerOption } from '../../schema/SchemaSurveyAnswerOption'

export interface SurveyAnswerOptionImageValue {
  path: string
  fileId: string
}

/** Fields come from {@link SchemaSurveyAnswerOption}. */
export class SurveyAnswerOption extends SchemaConstructor.from(
  SchemaSurveyAnswerOption,
) {
  update(data: SurveyAnswerOptionData): SurveyAnswerOption {
    return new SurveyAnswerOption({ ...this, ...data })
  }

  updateLabel(
    text: string,
    language: string = 'en',
    defaultLanguage?: string,
  ): SurveyAnswerOption {
    return this.update({
      label: setL10nField(this.label, text, language, defaultLanguage),
    })
  }

  setImageLang(
    image: SurveyAnswerOptionImageValue | null,
    lang: string,
  ): SurveyAnswerOption {
    const current = this.image ?? {}
    // Keep null as an explicit marker so the API can detect a clear operation.
    // The key is always present; null means "explicitly cleared for this lang".
    return this.update({ image: { ...current, [lang]: image } })
  }

  getImage(
    lang: string,
    langDefault: string,
  ): SurveyAnswerOptionImageValue | null {
    return this.image?.[lang] ?? this.image?.[langDefault] ?? null
  }

  hasImage(lang?: string, langDefault?: string): boolean {
    if (lang) return !!this.getImage(lang, langDefault ?? lang)
    return !!this.image && Object.values(this.image).some((v) => v !== null)
  }

  private getImageBasePath(lang: string, langDefault: string): string | null {
    const path = this.getImage(lang, langDefault)?.path
    if (!path) return null
    const lastSlash = path.lastIndexOf('/')
    return lastSlash !== -1 ? path.substring(0, lastSlash) : null
  }

  getEditedUrl(lang: string, langDefault: string): string | null {
    const base = this.getImageBasePath(lang, langDefault)
    return base ? `/veysur-files/${base}/edited.jpg` : null
  }

  getOriginalUrl(lang: string, langDefault: string): string | null {
    const base = this.getImageBasePath(lang, langDefault)
    return base ? `/veysur-files/${base}/original.jpg` : null
  }

  getThumbnailUrl(lang: string, langDefault: string): string | null {
    const base = this.getImageBasePath(lang, langDefault)
    return base ? `/veysur-files/${base}/thumb.jpg` : null
  }

  getImageSetId(lang: string, langDefault: string): string | null {
    const path = this.getImage(lang, langDefault)?.path
    if (!path) return null
    const match = path.match(/\/imgset-([^/]+)\//)
    return match ? match[1] : null
  }

  clearImage(lang?: string): SurveyAnswerOption {
    if (!lang) return this.update({ image: null })
    return this.setImageLang(null, lang)
  }
}

/** Raw data a {@link SurveyAnswerOption} is built from, derived from its schema. */
export type SurveyAnswerOptionData = NonNullable<
  ConstructorParameters<typeof SurveyAnswerOption>[0]
>
