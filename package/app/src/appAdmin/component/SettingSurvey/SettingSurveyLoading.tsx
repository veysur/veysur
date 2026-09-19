import React from 'react'

import { Skeleton } from 'component/shadcn/skeleton'
import { Card, CardHeader, CardContent } from 'component/shadcn/card'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from 'component/shadcn/sidebar'
import { Separator } from 'component/shadcn/separator'
import { SettingsSidebar } from '../SurveySettingShared/SettingsSidebar'

type Props = {
  header?: React.ReactNode
}

export const SettingSurveyLoading: React.FC<Props> = ({ header }) => {
  // Dummy function for sidebar during loading - won't be called since sidebar is in loading state
  const handleSectionChange = () => {}

  return (
    <SidebarProvider defaultOpen={true} className="h-full">
      <SettingsSidebar
        activeSection="language"
        onSectionChange={handleSectionChange}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 sm:block md:hidden" />
          <Separator
            orientation="vertical"
            className="mr-2 h-4 sm:block md:hidden"
          />
          {header ? (
            header
          ) : (
            <div className="flex flex-1 items-center justify-between">
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-3 w-64" />
              </div>
              <div className="flex gap-2 items-center">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          )}
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Skeleton Card 1 */}
            <Card className="mb-4 h-full">
              <CardHeader className="border-b">
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-3 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>

            {/* Skeleton Card 2 */}
            <Card className="mb-4 h-full">
              <CardHeader className="border-b">
                <Skeleton className="h-6 w-2/3" />
              </CardHeader>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>

            {/* Skeleton Card 3 */}
            <Card className="mb-4 h-full">
              <CardHeader className="border-b">
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-3 w-full mb-3" />
                <Skeleton className="h-3 w-5/6" />
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
