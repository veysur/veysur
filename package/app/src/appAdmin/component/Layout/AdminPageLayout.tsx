import React from 'react'

import { cn } from 'common/cn'
import { useTrackNavigationHistory } from 'common'
import { Container } from 'component/shadcn/container'
import { NavbarBrandAdmin } from 'appAdmin/component/Navbar'
import { AdminFooter } from './AdminFooter'

interface AdminPageLayoutProps {
  children: React.ReactNode
  fluid?: boolean
  className?: string
}

export const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({
  children,
  fluid = true,
  className,
}) => {
  useTrackNavigationHistory()

  return (
    <div className="min-h-screen flex flex-col">
      <NavbarBrandAdmin />
      <Container fluid={fluid} className={cn('flex-1 pt-8 pb-4', className)}>
        {children}
      </Container>
      <AdminFooter />
    </div>
  )
}
