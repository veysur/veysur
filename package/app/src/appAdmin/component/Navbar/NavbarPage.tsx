import { cn } from 'common/cn'

interface NavbarProps {
  className?: string
  right?: React.ReactNode
  center?: React.ReactNode
  left?: React.ReactNode
}

export const NavbarPage: React.FC<NavbarProps> = ({
  className = '',
  right = null,
  center = null,
  left = null,
}) => {
  return (
    <nav className={cn(className, 'flex justify-between sticky top-0')}>
      <div className={cn('container-fluid px-2', className)}>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 xl:col-span-2 flex justify-start items-center">
            {left}
          </div>
          <div className="col-span-6 xl:col-span-8 flex justify-center">
            {center}
          </div>
          <div className="col-span-3 xl:col-span-2 flex justify-end">
            {right}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default NavbarPage
