import React, { ReactNode } from 'react'
import {
  LogOut,
  CircleUser,
  ClipboardList,
  Settings,
  Users,
  FolderKanban,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback } from 'component/shadcn/avatar'
import { Button } from 'component/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'component/shadcn/dropdown-menu'
import { ModeToggle } from 'component/ModeToggle'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'

import { AuthLink } from 'component/AuthLink'
import { NavbarBrand } from 'component/Navbar'
import { AuthDomain } from 'model/service/AuthDomain/AuthDomain'
import { useAuth, useProjectDomain } from 'appAdmin/hook'
import { getAdminNavbarExtra, getProjectSwitcher } from 'registry'

interface NavbarBrandAdminProps {
  children?: ReactNode
  className?: string
}

// Resolved once at module scope, not per-render, so it stays a stable
// component reference (satisfies react-hooks/static-components) — same
// pattern as AccountFooter.tsx's getAccountFooterExtraNav() usage.
const ProjectSwitcherComponent = getProjectSwitcher()
const AdminNavbarExtraComponent = getAdminNavbarExtra()

export const NavbarBrandAdmin: React.FC<NavbarBrandAdminProps> = (props) => {
  const navigate = useNavigate()
  const { auth, authRefresh } = useAuth()
  const project = useProjectDomain()
  const isOwner = auth?.user?.projectOwn?.some((p) => p._id === project?._id)
  const navigation = (
    <nav className="flex items-center space-x-1 md:space-x-4">
      <Button
        variant="link"
        tooltip="Surveys"
        className="text-foreground/70 hover:text-primary dark:text-foreground/80 dark:hover:text-primary gap-1.5"
        asChild
      >
        <AuthLink
          targetUrl={`${window.location.origin}/survey`}
          loginPath="/admin/login"
          onNavigate={() => navigate('/survey')}
        >
          <ClipboardList className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">Surveys</span>
        </AuthLink>
      </Button>
      {isOwner && (
        <Button
          variant="link"
          tooltip="Team"
          className="text-foreground/70 hover:text-primary dark:text-foreground/80 dark:hover:text-primary gap-1.5"
          asChild
        >
          <AuthLink
            targetUrl={`${window.location.origin}/team`}
            loginPath="/admin/login"
            onNavigate={() => navigate('/team')}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">Team</span>
          </AuthLink>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger tooltip="Settings" asChild>
          <Button
            variant="link"
            className="text-foreground/70 hover:text-primary dark:text-foreground/80 dark:hover:text-primary gap-1.5"
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">Settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild>
            <AuthLink
              targetUrl={`${window.location.origin}/setting/survey/language`}
              loginPath="/admin/login"
              onNavigate={() => navigate('/setting/survey/language')}
            >
              <ClipboardList className="h-4 w-4" />
              Survey
            </AuthLink>
          </DropdownMenuItem>
          {isOwner && (
            <DropdownMenuItem asChild>
              <AuthLink
                targetUrl={`${window.location.origin}/setting/project`}
                loginPath="/admin/login"
                onNavigate={() => navigate('/setting/project')}
              >
                <FolderKanban className="h-4 w-4" />
                Project
              </AuthLink>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {AdminNavbarExtraComponent && <AdminNavbarExtraComponent />}
    </nav>
  )
  const accountMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger tooltip="My Account" asChild>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarFallback>K</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <AuthLink
            targetUrl={AuthDomain.getAccountUrl()}
            auth={auth}
            authRefresh={authRefresh}
            loginPath="/admin/login"
            openWithAuth={(_targetUrl, auth, authRefresh) =>
              AuthDomain.openAccountWithAuth(auth, authRefresh)
            }
          >
            <CircleUser className="h-4 w-4" />
            Manage Account
          </AuthLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DialogConfirmClickable
          as={DropdownMenuItem}
          title="Logout"
          message={`Are you sure you want to logout?`}
          actionText="Logout"
          confirmAction={() => navigate('/logout')}
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </DialogConfirmClickable>
      </DropdownMenuContent>
    </DropdownMenu>
  )
  return (
    <NavbarBrand
      linkPath="/"
      title={
        ProjectSwitcherComponent ? <ProjectSwitcherComponent /> : undefined
      }
      right={
        <div className="flex items-center space-x-2">
          <ModeToggle />
          {accountMenu}
        </div>
      }
    >
      {navigation}
      {props.children}
    </NavbarBrand>
  )
}

export default NavbarBrandAdmin
