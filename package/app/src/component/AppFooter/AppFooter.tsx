import React, { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'

import { Button } from 'component/shadcn/button'
import { CookieSettingsButton } from 'component/CookieConsent'

const year = new Date().getFullYear()
const appDomain = process.env.PUBLIC_APP_DOMAIN || 'veysur.com'
const contactUrl = `${window.location.protocol}//www.${appDomain}/contact`

export const footerNavClass =
  'h-auto p-0 hover:text-foreground hover:bg-transparent'

interface AppFooterProps {
  extraNavItems?: React.ReactNode
  hideContactLink?: boolean
}

// Hides the footer logo while the navbar logo is also visible on screen,
// avoiding two identical logos showing at once on short pages.
function useHideWhileNavbarLogoVisible() {
  const [isNavbarLogoVisible, setIsNavbarLogoVisible] = useState(true)

  useEffect(() => {
    const navbarLogo = document.getElementById('navbar-logo')
    if (!navbarLogo) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsNavbarLogoVisible(entry.isIntersecting),
      { threshold: 1 },
    )
    observer.observe(navbarLogo)

    return () => observer.disconnect()
  }, [])

  return isNavbarLogoVisible
}

export const AppFooter: React.FC<AppFooterProps> = ({
  extraNavItems,
  hideContactLink,
}) => {
  const isNavbarLogoVisible = useHideWhileNavbarLogoVisible()

  return (
    <footer className="border-t border-border bg-footer text-footer-foreground py-6">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div
            className={`flex flex-col items-center gap-1 sm:items-start transition-opacity duration-300 ${
              isNavbarLogoVisible ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <img
              src="/image/veysur-logo-light.svg"
              alt="VeySur"
              className="h-12 w-auto dark:hidden"
            />
            <img
              src="/image/veysur-logo-dark.svg"
              alt="VeySur"
              className="h-12 w-auto hidden dark:block"
            />
            <span className="text-muted-foreground text-sm">
              Plan Promote Progress
            </span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {!hideContactLink && (
              <Button
                variant="ghost"
                className={footerNavClass}
                tooltip="Contact"
                asChild
              >
                <a href={contactUrl}>
                  <Mail size={14} />
                  Contact
                </a>
              </Button>
            )}
            {extraNavItems}
          </nav>
          <div className="hidden sm:block" />
        </div>
        <div className="mt-6 flex items-center justify-between">
          <CookieSettingsButton />
          <p className="text-xs text-muted-foreground/60">
            &copy; {year} VeySur. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
