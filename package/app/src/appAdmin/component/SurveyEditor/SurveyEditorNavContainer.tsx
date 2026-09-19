import React from 'react'
import { Menu, Layers } from 'lucide-react'

import {
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from 'component/shadcn/sidebar'
import { Button } from 'component/shadcn/button'
import { NavbarBrandAdmin } from 'appAdmin/component/Navbar'

import { SidebarSurvey } from './SidebarSurvey'

interface Props {
  children?: React.ReactNode
  surveyName?: string
  headerActions?: React.ReactNode
  leftSidebar?: React.ReactNode
  rightSidebar?: React.ReactNode
  headerBar?: (
    toggleOuter: () => void,
    toggleLeft?: () => void,
  ) => React.ReactNode
}

export type MobilePanelView = 'editor' | 'structure' | 'attributes'

const OuterSidebarWrapper: React.FC<{
  children: (toggleSidebar: () => void) => React.ReactNode
}> = ({ children }) => {
  const { toggleSidebar } = useSidebar()
  return <>{children(toggleSidebar)}</>
}

const LeftSidebarWrapper: React.FC<{
  children: (toggleSidebar: () => void) => React.ReactNode
}> = ({ children }) => {
  const { toggleSidebar } = useSidebar()
  return <>{children(toggleSidebar)}</>
}

const HeaderBar: React.FC<{
  surveyName?: string
  headerActions?: React.ReactNode
  toggleOuterSidebar: () => void
  toggleLeftSidebar?: () => void
}> = ({ surveyName, headerActions, toggleOuterSidebar, toggleLeftSidebar }) => (
  <div className="z-40 bg-sidebar border-b py-2">
    <div className="px-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 lg:hidden"
            onClick={toggleOuterSidebar}
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Navigation</span>
          </Button>
          {toggleLeftSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 lg:hidden"
              onClick={toggleLeftSidebar}
            >
              <Layers className="h-4 w-4" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          )}
          {surveyName && (
            <div className="text-xl font-semibold">{surveyName}</div>
          )}
        </div>
        {headerActions && (
          <div className="flex items-center space-x-2">{headerActions}</div>
        )}
      </div>
    </div>
  </div>
)

export const SurveyEditorNavContainer: React.FC<Props> = ({
  children,
  surveyName,
  headerActions,
  leftSidebar,
  rightSidebar,
  headerBar,
}) => {
  const defaultHeaderBar = (
    toggleOuter: () => void,
    toggleLeft?: () => void,
  ) => (
    <HeaderBar
      surveyName={surveyName}
      headerActions={headerActions}
      toggleOuterSidebar={toggleOuter}
      toggleLeftSidebar={toggleLeft}
    />
  )

  const renderHeaderBar = headerBar || defaultHeaderBar

  const content = (toggleOuter: () => void, toggleLeft?: () => void) => {
    const header = renderHeaderBar(toggleOuter, toggleLeft)
    const mainContent = rightSidebar ? (
      <SidebarProvider className="h-full flex-1">
        <SidebarInset className="h-full flex flex-col min-w-0 pb-12">
          {header}
          {children}
        </SidebarInset>
        {rightSidebar}
      </SidebarProvider>
    ) : (
      <div className="flex flex-col h-full min-w-0 pb-12">
        {header}
        {children}
      </div>
    )

    return mainContent
  }

  return (
    <div className="flex flex-col h-full">
      <NavbarBrandAdmin />
      <div className="flex-1 overflow-hidden flex">
        <SidebarProvider>
          <SidebarSurvey />
          <SidebarInset className="min-w-0">
            <OuterSidebarWrapper>
              {(toggleOuter) =>
                leftSidebar ? (
                  <SidebarProvider>
                    {leftSidebar}
                    <SidebarInset className="pb-12">
                      <LeftSidebarWrapper>
                        {(toggleLeft) => content(toggleOuter, toggleLeft)}
                      </LeftSidebarWrapper>
                    </SidebarInset>
                  </SidebarProvider>
                ) : (
                  content(toggleOuter)
                )
              }
            </OuterSidebarWrapper>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  )
}
