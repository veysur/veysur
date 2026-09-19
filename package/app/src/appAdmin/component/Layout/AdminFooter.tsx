import React from 'react'
import { BookOpen } from 'lucide-react'

import { footerNavClass } from 'component/AppFooter'
import { Button } from 'component/shadcn/button'
import { AuthDomain } from 'model/service/AuthDomain/AuthDomain'

export const AdminFooter: React.FC = () => (
  <footer className="border-t border-border bg-footer text-footer-foreground px-4 py-3 flex items-center justify-end">
    <Button variant="ghost" className={footerNavClass} tooltip="Docs" asChild>
      <a
        href={AuthDomain.getDocsUrl()}
        target="_blank"
        rel="noopener noreferrer"
      >
        <BookOpen size={14} />
        Docs
      </a>
    </Button>
  </footer>
)
