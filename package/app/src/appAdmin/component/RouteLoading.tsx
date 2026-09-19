import React from 'react'

import { NavbarBrand } from 'component/Navbar'
import { GoldenCentered } from 'component/GoldenCentered'

export const RouteLoading: React.FC = () => {
  return (
    <>
      <NavbarBrand href="/" />
      <GoldenCentered className="min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </GoldenCentered>
    </>
  )
}
