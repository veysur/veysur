import React, { useState } from 'react'
import { Editor } from '@tiptap/react'
import { ChevronDown } from 'lucide-react'

import { cn } from 'common/cn'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from 'component/shadcn/popover'

import { ToolbarButton } from './ToolbarButton'

// Kept in sync with the `heading` levels enabled on the editor in
// `ContentEditor` - a level offered here that the schema doesn't allow is a
// no-op.
export const HEADING_LEVELS = [1, 2, 3, 4] as const

type Props = {
  editor: Editor
  /** See `TiptapToolbar`'s `flushBubbleMenuPreventHide` - a Popover next to a
   * TipTap BubbleMenu must flush the stale `preventHide` flag on close. */
  onOpenChange?: (open: boolean) => void
}

const itemClass = (active: boolean) =>
  cn(
    'flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm',
    'cursor-pointer outline-none transition-colors',
    'hover:bg-accent hover:text-accent-foreground',
    active && 'bg-accent font-semibold',
  )

/**
 * Collapses the H1-H4 / paragraph block-type controls into a single toolbar
 * dropdown. Built on `Popover` rather than Radix `DropdownMenu` for the same
 * reason `VariablePicker` is - DropdownMenu forces focus into its content on
 * open, which would blur the editor and hide the bubble menu.
 */
export const HeadingMenu: React.FC<Props> = ({ editor, onOpenChange }) => {
  const [open, setOpen] = useState(false)

  const activeLevel = HEADING_LEVELS.find((level) =>
    editor.isActive('heading', { level }),
  )

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }

  const applyAndClose = (run: () => void) => {
    run()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <ToolbarButton active={activeLevel != null} title="Text style">
          {activeLevel ? `H${activeLevel}` : 'P'}
          <ChevronDown size={12} />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-36 p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
      >
        <button
          type="button"
          className={itemClass(!activeLevel)}
          onClick={() =>
            applyAndClose(() => editor.chain().focus().setParagraph().run())
          }
        >
          Paragraph
        </button>
        {HEADING_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            className={itemClass(activeLevel === level)}
            onClick={() =>
              applyAndClose(() =>
                editor.chain().focus().toggleHeading({ level }).run(),
              )
            }
          >
            Heading {level}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
