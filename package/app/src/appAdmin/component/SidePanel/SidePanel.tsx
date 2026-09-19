import React from 'react'

import { Card, CardHeader, CardContent } from 'component/shadcn/card'
import { cn } from 'common/cn'

export interface SidePanelProps {
  className?: string
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void
}

export const SidePanel: React.FC<SidePanelProps & React.PropsWithChildren> = ({
  children,
  className,
  onClick,
}) => {
  return (
    <div className={cn('px-0', className)} onClick={onClick}>
      {children}
    </div>
  )
}

export interface SectionGroupProps {
  title?: string
  className?: string
  defaultActiveKey?: string
}

export const SectionGroup: React.FC<
  SectionGroupProps & React.PropsWithChildren
> = ({ children, title, className }) => {
  const header = title && (
    <div className="text-sm p-2 pb-0 flex justify-center font-medium text-muted-foreground">
      {title}
    </div>
  )
  return (
    <div className={cn(className)}>
      {header}
      {children}
    </div>
  )
}

export interface SectionProps {
  eventKey: string
  title: string
  className?: string
}

export const Section: React.FC<SectionProps & React.PropsWithChildren> = ({
  children,
  title,
  className,
}) => {
  return (
    <Card className={cn(className)}>
      <CardHeader>{title}</CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}
