import React from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  Users,
  MessageSquare,
  Settings,
  PenSquare,
  View,
  Share2,
  BookOpen,
  BarChart3,
} from 'lucide-react'

import { usePublished } from '../SurveyEditorPublish/hook/usePublished'
import { useSurveyEditorStore } from './hook/useSurveyEditorStore'

import { cn } from 'common/cn'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from 'component/shadcn/sidebar'

type NavItem = {
  key: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  matchPrefix?: string
  disabled?: boolean
  showChangeDot?: boolean
}

export const SidebarSurvey: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>()
  const { pathname: currentPath } = useLocation()
  const { isPublished, hasUnpublishedChanges } = usePublished({ surveyId })
  const patchBuffer = useSurveyEditorStore((state) => state.patchBuffer)
  const { isMobile, setOpenMobile } = useSidebar()

  const showChangeDot = patchBuffer?.hasPending() || hasUnpublishedChanges

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const navItems: NavItem[] = [
    {
      key: `/survey/${surveyId}/edit`,
      to: `/survey/${surveyId}/edit`,
      icon: PenSquare,
      label: 'Edit',
    },
    {
      key: `/survey/${surveyId}/preview`,
      to: `/survey/${surveyId}/preview`,
      icon: View,
      label: 'Preview',
    },
    {
      key: `/survey/${surveyId}/participant`,
      to: `/survey/${surveyId}/participant`,
      icon: Users,
      label: 'Participant',
    },
    {
      key: `/survey/${surveyId}/response`,
      to: `/survey/${surveyId}/response`,
      icon: MessageSquare,
      label: 'Response',
    },
    {
      key: `/survey/${surveyId}/stat`,
      to: `/survey/${surveyId}/stat`,
      icon: BarChart3,
      label: 'Stats',
    },
    {
      key: `/survey/${surveyId}/publication`,
      to: `/survey/${surveyId}/publication`,
      icon: BookOpen,
      label: 'Publication',
      showChangeDot,
    },
    {
      key: `/survey/${surveyId}/setting/language`,
      to: `/survey/${surveyId}/setting/language`,
      matchPrefix: `/survey/${surveyId}/setting`,
      icon: Settings,
      label: 'Setting',
    },
    {
      key: `/survey/${surveyId}/share`,
      to: `/survey/${surveyId}/share`,
      icon: Share2,
      label: 'Share',
      disabled: !isPublished,
    },
  ]

  return (
    <Sidebar
      collapsible="icon"
      side="left"
      className="h-full"
      mobileWidth="5.4rem"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = currentPath.startsWith(
                item.matchPrefix ?? item.to,
              )
              const Icon = item.icon
              const isDisabled = item.disabled ?? false
              const tooltipLabel = isDisabled
                ? 'Publish the survey to enable sharing'
                : item.label
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    tooltip={{
                      children: tooltipLabel,
                      hidden: false,
                    }}
                    isActive={isActive}
                    className="px-2.5 md:px-2 !h-auto group-data-[collapsible=icon]:!h-auto group-data-[collapsible=icon]:!w-full"
                  >
                    {isDisabled ? (
                      // Not aria-disabled/pointer-events-none: that would
                      // also block hover on this element, which is what the
                      // Tooltip's asChild trigger listens on - a plain,
                      // non-interactive span already can't be navigated to.
                      <span
                        className={cn(
                          'flex flex-col items-center gap-1 py-2',
                          '!opacity-40 cursor-not-allowed',
                        )}
                      >
                        <span className="relative">
                          <Icon className="size-4" />
                          {item.showChangeDot && (
                            <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-amber-500" />
                          )}
                        </span>
                        <span className="text-xs text-center">
                          {item.label}
                        </span>
                      </span>
                    ) : (
                      <Link
                        to={item.to}
                        onClick={handleNavClick}
                        className="flex flex-col items-center gap-1 py-2"
                      >
                        <span className="relative">
                          <Icon className="size-4" />
                          {item.showChangeDot && (
                            <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-amber-500" />
                          )}
                        </span>
                        <span className="text-xs text-center">
                          {item.label}
                        </span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default SidebarSurvey
