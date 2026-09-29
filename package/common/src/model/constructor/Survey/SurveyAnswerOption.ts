import { genUniqueId } from '@datacapy/id'
import { PropsOf } from '@datacapy/schema'

import { L10n, setL10nField } from '../L10n'

export interface SurveyAnswerOptionImageValue {
  path: string
  fileId: string
}

export interface SurveyAnswerOptionData {
  _id: string
  createdById: string
  code: string
  label: PropsOf<L10n>
  createdAt: Date
  updatedAt: Date
  // Per-language image map. A null value for a key means the image was explicitly
  // cleared for that language (distinct from the key being absent).
  image?: Record<string, SurveyAnswerOptionImageValue | null> | null
}

export class SurveyAnswerOption {
  _id: string
  createdById: string
  code: string
  label: L10n
  createdAt: Date
  updatedAt: Date
  image: Record<string, SurveyAnswerOptionImageValue | null> | null

  constructor(data: Partial<PropsOf<SurveyAnswerOptionData>> = {}) {
    this._id = data?._id || genUniqueId()
    this.createdById = data?.createdById
    this.code = data?.code || ''
    this.label = new L10n(data?.label)
    this.createdAt = new Date(data?.createdAt)
    this.updatedAt = new Date(data?.updatedAt)
    this.image = data?.image ?? null
  }

  update(data: Partial<SurveyAnswerOptionData>): SurveyAnswerOption {
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
