import React from 'react'

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from 'component/shadcn/sidebar'
import { Separator } from 'component/shadcn/separator'

import { SettingsSidebar } from './SettingsSidebar'

type Props = {
  activeSection: string
  onSectionChange: (section: string) => void
  children: React.ReactNode
  header?: React.ReactNode
}

export const SettingsLayout: React.FC<Props> = ({
  activeSection,
  onSectionChange,
  children,
  header,
}) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <SettingsSidebar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />
      <SidebarInset className="pb-12">
        {header && (
          <>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
              <SidebarTrigger className="-ml-1 sm:block md:hidden" />
              <Separator
                orientation="vertical"
                className="mr-2 h-4 sm:block md:hidden"
              />
              {header}
            </header>
          </>
        )}
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
