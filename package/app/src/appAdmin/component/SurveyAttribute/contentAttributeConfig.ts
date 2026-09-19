import { LucideIcon, Type, Video } from 'lucide-react'
import { CONTENT_TYPE_TEXT, CONTENT_TYPE_YOUTUBE } from 'veysur-common'

/**
 * Single source of truth for content-element type + label + icon.
 * Consumed by the Content Attributes panel (`ContentTypeSelect` /
 * `ContentTypeModal`) and the add-element flow (`AddElementPanel` opens
 * `ContentTypeModal`).
 */
export type ContentTypeOptionConfig = {
  type: string
  label: string
  icon: LucideIcon
}

export const contentTypeOptions: ContentTypeOptionConfig[] = [
  { type: CONTENT_TYPE_TEXT, label: 'Text content', icon: Type },
  { type: CONTENT_TYPE_YOUTUBE, label: 'Video (YouTube)', icon: Video },
]
