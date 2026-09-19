import { useState, useEffect } from 'react'

const breakpoints = {
  xs: '(max-width: 575.98px)',
  sm: '(min-width: 576px) and (max-width: 767.98px)',
  md: '(min-width: 768px) and (max-width: 991.98px)',
  lg: '(min-width: 992px) and (max-width: 1199.98px)',
  xl: '(min-width: 1200px) and (max-width: 1399.98px)',
  xxl: '(min-width: 1400px)',
}

type Breakpoint = keyof typeof breakpoints

export const useBreakpoint = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs')

  useEffect(() => {
    const handleResize = () => {
      const currentBreakpoint =
        (Object.keys(breakpoints) as Breakpoint[]).find(
          (key) => window.matchMedia(breakpoints[key]).matches,
        ) || 'xs'
      setBreakpoint(currentBreakpoint)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return breakpoint
}

export default useBreakpoint
