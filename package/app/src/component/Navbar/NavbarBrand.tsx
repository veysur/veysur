import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface NavbarBrandProps {
  linkPath?: string
  href?: string
  title?: ReactNode
  children?: ReactNode
  right?: ReactNode
}

interface BrandLinkProps {
  href?: string
  linkPath: string
  id?: string
  className?: string
  'aria-label'?: string
  children: ReactNode
}

function BrandLink({ href, linkPath, ...props }: BrandLinkProps) {
  return href ? <a href={href} {...props} /> : <Link to={linkPath} {...props} />
}

export function NavbarBrand({
  linkPath = '/',
  href,
  title,
  children,
  right,
}: NavbarBrandProps) {
  // The header background is permanently ink-dark in both light and dark
  // mode, so the logo always renders the light-wordmark (-dark.svg) variant
  // here, unlike surfaces that follow the page's colour scheme.
  const logoImages = (
    <img
      src="/image/veysur-logo-dark.svg"
      alt="VeySur"
      className="h-12 -translate-y-2 w-auto"
    />
  )

  return (
    <header className="z-50 bg-header text-header-foreground border-b border-border">
      <div className="grid grid-cols-[1fr_auto_1fr] h-20 items-center px-4 sm:px-6 lg:px-8 gap-2">
        <div className="flex items-center gap-3 -mb-4 min-w-0">
          <BrandLink
            href={href}
            linkPath={linkPath}
            id="navbar-logo"
            className="flex items-center navbar-brand-custom"
            aria-label="VeySur home"
          >
            {logoImages}
          </BrandLink>
          {title &&
            (typeof title === 'string' ? (
              <span className="text-lg font-large text-header-foreground/80 hidden sm:inline">
                <span className="ml-3 mr-3">|</span>
                <BrandLink href={href} linkPath={linkPath} aria-label={title}>
                  {title}
                </BrandLink>
              </span>
            ) : (
              <div className="hidden sm:flex items-center text-header-foreground/80 gap-1.5">
                <span>|</span>
                {title}
              </div>
            ))}
        </div>
        <div className="flex justify-center items-center">{children}</div>
        <div className="flex justify-end items-center">{right}</div>
      </div>
    </header>
  )
}

export default NavbarBrand
