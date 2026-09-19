import {
  Globe,
  Palette,
  User,
  Lock,
  Database,
  Clock,
  Shield,
  Scale,
  Bell,
  Mail,
  FileCode,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type SettingCategory =
  | 'content'
  | 'user'
  | 'security'
  | 'data'
  | 'schedule'
  | 'legal'
  | 'communication'

export type SettingInfo = {
  key: string
  title: string
  icon: LucideIcon
  category: SettingCategory
  description: string
}

export const settingsConfig: SettingInfo[] = [
  {
    key: 'language',
    title: 'Language',
    icon: Globe,
    category: 'content',
    description: 'Configure survey languages and localization',
  },
  {
    key: 'presentation',
    title: 'Presentation',
    icon: Palette,
    category: 'content',
    description: 'Control how survey content is displayed',
  },
  {
    key: 'contentFormat',
    title: 'Content Format',
    icon: FileCode,
    category: 'content',
    description: 'Control what content format and sanitization is allowed',
  },
  {
    key: 'participant',
    title: 'Participant',
    icon: User,
    category: 'user',
    description: 'Participant communication and authentication',
  },
  {
    key: 'access',
    title: 'Access',
    icon: Lock,
    category: 'security',
    description: 'Access control and security settings',
  },
  {
    key: 'data',
    title: 'Data',
    icon: Database,
    category: 'data',
    description: 'Data collection and privacy tracking',
  },
  {
    key: 'schedule',
    title: 'Schedule',
    icon: Clock,
    category: 'schedule',
    description: 'Control when the published survey is accessible',
  },
  {
    key: 'dataPolicy',
    title: 'Data Policy',
    icon: Shield,
    category: 'legal',
    description: 'Data policy configuration',
  },
  {
    key: 'legalNotice',
    title: 'Legal Notice',
    icon: Scale,
    category: 'legal',
    description: 'Legal notice and terms configuration',
  },
  {
    key: 'notify',
    title: 'Notifications',
    icon: Bell,
    category: 'user',
    description: 'Notification and alert settings',
  },
  {
    key: 'emailTemplates',
    title: 'Templates',
    icon: Mail,
    category: 'communication',
    description: 'Customize email templates for invitations and notifications',
  },
]

export type CategoryConfig = {
  label: string
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
}

export const categoryConfig: Record<SettingCategory, CategoryConfig> = {
  content: { label: 'Content & Display', variant: 'secondary' },
  user: { label: 'User Experience', variant: 'secondary' },
  security: { label: 'Security & Access', variant: 'secondary' },
  data: { label: 'Data & Analytics', variant: 'secondary' },
  schedule: { label: 'Schedule', variant: 'secondary' },
  legal: { label: 'Legal & Compliance', variant: 'secondary' },
  communication: { label: 'Email', variant: 'secondary' },
}

export const settingsByCategory = settingsConfig.reduce(
  (acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  },
  {} as Record<SettingCategory, SettingInfo[]>,
)
