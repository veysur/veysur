import { Settings, Layers } from 'lucide-react'

import { Button } from 'component/shadcn/button'

export interface SurveyEditorMobileBarProps {
  onToggleStructure?: () => void
  onToggleAttributes: () => void
}

/** Bottom bar opening the Structure and Attributes panels below the lg breakpoint. */
export function SurveyEditorMobileBar({
  onToggleStructure,
  onToggleAttributes,
}: SurveyEditorMobileBarProps) {
  return (
    <nav
      aria-label="Editor panels"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t bg-sidebar h-[calc(3.25rem+env(safe-area-inset-bottom))] px-3 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {onToggleStructure ? (
        <Button
          variant="ghost"
          className="h-10 gap-2 px-4"
          onClick={onToggleStructure}
        >
          <Layers className="h-4 w-4" />
          Structure
        </Button>
      ) : (
        <span />
      )}
      <Button
        variant="ghost"
        className="h-10 gap-2 px-4"
        onClick={onToggleAttributes}
      >
        <Settings className="h-4 w-4" />
        Attributes
      </Button>
    </nav>
  )
}
