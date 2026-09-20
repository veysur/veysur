import React, { ReactNode } from 'react'
import {
  LogOut,
  MailWarning,
  CircleUser,
  ClipboardList,
  Settings,
  Users,
  FolderKanban,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { AccountNavItem } from 'model'
import { useAuth } from 'hook/useAuth'
import { getAccountNavProvider } from 'registry'
import { AuthLink } from 'component/AuthLink'
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

import { NavbarBrand } from 'component/Navbar'
import { AuthDomain } from 'model/service/AuthDomain/AuthDomain'
import { isSelfHosted } from 'common'

// Resolved once at module scope, not inside the component — the registry
// value is stable for the process lifetime (set once, before this module is
// ever imported; see appAccount/Router.tsx). See AccountFooter.tsx for the
// same convention.
const accountNavProvider = getAccountNavProvider()

interface NavbarBrandAccountProps {
  children?: ReactNode
  className?: string
}

export const NavbarBrandAccount: React.FC<NavbarBrandAccountProps> = (
  props,
) => {
  const navigate = useNavigate()
  const { auth, authRefresh } = useAuth()
  const isEmailVerified =
    auth?.user?.emailMeta?.verify?.status?.isVerified === true
  // Self-hosted only ever has one project, so ownership of *the* project can
  // be read straight off the user without resolving a project id the way
  // NavbarBrandAdmin's `isOwner` does via `useProjectDomain()` - the account
  // app has no per-project domain to resolve against.
  const isOwner = isSelfHosted() && (auth?.user?.projectOwn?.length ?? 0) > 0

  // Which items appear here (the edition's own entries vs. a single Surveys link) is
  // edition-specific - see `model/AccountUiExtension.ts`'s `AccountNavProvider`
  // and `registry/getAccountNavProvider.ts`.
  const navItems: AccountNavItem[] = accountNavProvider.getNavItems()

  const navigation = (
    <nav className="flex items-center space-x-1 md:space-x-4">
      {navItems.map(({ label, icon: Icon, path, tooltip, external }) => (
        <Button
          key={path}
          variant="link"
          tooltip={tooltip}
          className="text-foreground/70 hover:text-primary dark:text-foreground/80 dark:hover:text-primary gap-1.5"
          asChild
        >
          <AuthLink
            targetUrl={external ? path : `${window.location.origin}${path}`}
            auth={auth}
            authRefresh={authRefresh}
            onNavigate={external ? undefined : () => navigate(path)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">{label}</span>
          </AuthLink>
        </Button>
      ))}
      {isSelfHosted() && isOwner && (
        <Button
          variant="link"
          tooltip="Team"
          className="text-foreground/70 hover:text-primary dark:text-foreground/80 dark:hover:text-primary gap-1.5"
          asChild
        >
          <AuthLink
            targetUrl={AuthDomain.getAdminUrl(window.location.host, '/team')}
            auth={auth}
            authRefresh={authRefresh}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">Team</span>
          </AuthLink>
        </Button>
      )}
      {isSelfHosted() && (
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
                targetUrl={AuthDomain.getAdminUrl(
                  window.location.host,
                  '/setting/survey/language',
                )}
                auth={auth}
                authRefresh={authRefresh}
              >
                <ClipboardList className="h-4 w-4" />
                Survey
              </AuthLink>
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem asChild>
                <AuthLink
                  targetUrl={AuthDomain.getAdminUrl(
                    window.location.host,
                    '/setting/project',
                  )}
                  auth={auth}
                  authRefresh={authRefresh}
                >
                  <FolderKanban className="h-4 w-4" />
                  Project
                </AuthLink>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
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
        {isSelfHosted() && (
          <>
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <CircleUser className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
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
      title={isSelfHosted() ? undefined : 'Account'}
      right={
        <div className="flex items-center space-x-2">
          {!isEmailVerified && auth?.user?.email && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-amber-500 hover:text-amber-600"
              onClick={() =>
                navigate(
                  `/verify-email?${new URLSearchParams({ email: auth.user.email }).toString()}`,
                )
              }
              tooltip="Verify your email address"
            >
              <MailWarning className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          )}
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

export default NavbarBrandAccount
