import React, { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from 'component/shadcn/sidebar'
import { Badge } from 'component/shadcn/badge'

import { SearchBar } from 'appAdmin/component/SearchBar'

import {
  settingsConfig,
  categoryConfig,
  type SettingCategory,
} from './settingsConfig'

type Props = {
  activeSection: string
  onSectionChange: (section: string) => void
}

export const SettingsSidebar: React.FC<Props> = ({
  activeSection,
  onSectionChange,
}) => {
  const { setOpenMobile } = useSidebar()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSettings = useMemo(() => {
    if (!searchQuery.trim()) return settingsConfig

    const query = searchQuery.toLowerCase()
    return settingsConfig.filter(
      (setting) =>
        setting.title.toLowerCase().includes(query) ||
        setting.description.toLowerCase().includes(query) ||
        categoryConfig[setting.category].label.toLowerCase().includes(query),
    )
  }, [searchQuery])

  // Group filtered settings by category
  const filteredByCategory = useMemo(() => {
    return filteredSettings.reduce(
      (acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = []
        }
        acc[setting.category].push(setting)
        return acc
      },
      {} as Record<SettingCategory, typeof settingsConfig>,
    )
  }, [filteredSettings])

  const categoryOrder: SettingCategory[] = [
    'content',
    'user',
    'communication',
    'security',
    'data',
    'schedule',
    'legal',
  ]

  return (
    <Sidebar variant="sidebar" className="h-full">
      <SidebarHeader>
        <div className="px-2 py-2">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search settings..."
            className="w-full"
          />
        </div>
        {!searchQuery && (
          <div className="px-2 text-xs text-muted-foreground">
            {settingsConfig.length} settings
          </div>
        )}
        {searchQuery && (
          <div className="px-2 text-xs text-muted-foreground">
            {filteredSettings.length} of {settingsConfig.length} settings
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {categoryOrder.map((categoryKey) => {
          const settings = filteredByCategory[categoryKey]
          if (!settings || settings.length === 0) return null

          const category = categoryConfig[categoryKey]

          return (
            <SidebarGroup key={categoryKey}>
              <SidebarGroupLabel className="flex items-center gap-2">
                <span>{category.label}</span>
                <Badge variant={category.variant} className="text-xs ml-auto">
                  {settings.length}
                </Badge>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {settings.map((setting) => {
                    const Icon = setting.icon
                    return (
                      <SidebarMenuItem key={setting.key}>
                        <SidebarMenuButton
                          isActive={activeSection === setting.key}
                          onClick={() => {
                            onSectionChange(setting.key)
                            setOpenMobile(false)
                          }}
                          tooltip={setting.title}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{setting.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}

        {filteredSettings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No settings found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a different search term
            </p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
