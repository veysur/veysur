import React from 'react'
import { Container } from 'component/shadcn/container'

export interface PageMessageProps {
  title?: string
  message?: string
  children?: React.ReactNode
}

export const PageMessage: React.FC<PageMessageProps> = ({
  title,
  message,
  children,
}) => {
  return (
    <Container fluid>
      <div className="text-center">
        {title && <div className="text-2xl font-semibold mb-2">{title}</div>}
        {message && <p className="text-muted-foreground">{message}</p>}
        {children}
      </div>
    </Container>
  )
}
