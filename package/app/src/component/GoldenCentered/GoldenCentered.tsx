import type React from 'react'

import { cn } from 'common/cn'

type Props = {
  children: React.ReactNode
  maxWidth?: string
  className?: string
  style?: React.CSSProperties
  /** Total fixed height above this component from the viewport top (navbar + any page headers + spacing). Used to keep the golden-ratio point anchored to the full viewport rather than just the local container. Defaults to '4rem' (standard h-16 navbar). */
  topOffset?: string
}

export const GoldenCentered: React.FC<Props> = ({
  children,
  maxWidth = 'max-w-md',
  className,
  style,
  topOffset = '4rem',
}) => (
  <div className={cn('flex flex-col', className)} style={style}>
    <div style={{ flex: 1 }} />
    <div className={cn('w-full mx-auto', maxWidth)}>{children}</div>
    <div style={{ flex: 1.618, flexBasis: `calc(1.618 * (${topOffset}))` }} />
  </div>
)
