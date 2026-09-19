import { useState } from 'react'
import { VariableEntry } from 'veysur-common'
import { LucideIcon, Variable } from 'lucide-react'

import { cn } from 'common/cn'
import { Button } from 'component/shadcn/button'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from 'component/shadcn/popover'
import { ToolbarButton } from 'appAdmin/component/ContentEditor/ToolbarButton'

export interface VariablePickerGroup {
  label: string
  /** Icon shown next to the group's label. Optional so a group can fall back
   * to a plain text header. */
  icon?: LucideIcon
  entries: VariableEntry[]
}

type VariablePickerProps = {
  /** Groups of variables, e.g. { label: 'Participant', entries: [...] }.
   * Rendered as labelled sections in the dropdown, in the order given. */
  groups: VariablePickerGroup[]
  /** Called with the raw dotted path (e.g. `participant.email`) of the
   * selected variable - wrapping it in `{{...}}` (or not, for condition code)
   * is the caller's responsibility, since that varies by consumer. */
  onSelect: (path: string) => void
  /** Small icon-only trigger by default; pass a custom label for a wider button. */
  triggerLabel?: string
  disabled?: boolean
  /** Trigger button style - `'outline'` (default, the shadcn `Button`'s
   * outline variant) for standalone use next to a plain input; `'ghost'`
   * for a caller embedding this inside `ContentEditor`'s bubble toolbar, where
   * it renders via the shared `ToolbarButton` component so it's pixel-
   * identical to the toolbar's other buttons (Bold, Italic, ...) rather
   * than a hand-matched approximation of their styling. */
  triggerVariant?: 'outline' | 'ghost'
  /** Called whenever the picker's open state changes - see the "stuck
   * toolbar" note below for why a caller sitting next to a TipTap
   * `BubbleMenu` needs this. */
  onOpenChange?: (open: boolean) => void
}

/**
 * Reusable dropdown for inserting a `answers.*`/`participant.*`/`survey.*`/
 * `project.*`/`projectOwner.*` variable reference into a text field. Shared
 * by `BaseEmailTemplateSettings`, `BaseNotifySettings`, and `ConditionEditor`'s
 * code editor, each of which previously had no variable-insertion affordance
 * at all (plain free-text inputs only).
 *
 * Built on `Popover` rather than `DropdownMenu`: Radix's DropdownMenu
 * deliberately does not expose `onOpenAutoFocus` (part of the ARIA menu
 * pattern that focus always moves into the menu on open), so there is no way
 * to stop it moving DOM focus into the menu content the instant it opens -
 * blurring whatever the trigger sits next to before the user has even
 * hovered an item. `Popover` has no such requirement and exposes
 * `onOpenAutoFocus`, so a caller's source input (e.g. ContentEditor's toolbar)
 * can stay focused for the entire open-hover-select flow - the same
 * tradeoff `MultipleChoiceDropdown` already makes for its own multi-select
 * list.
 *
 * Note for a caller sitting next to a TipTap `BubbleMenu`: TipTap sets an
 * internal `preventHide` flag on any mousedown inside the bubble menu's own
 * DOM (which this picker's trigger button is part of, being rendered inside
 * the bubble menu), meant to be consumed by exactly one subsequent blur so
 * clicking a toolbar button doesn't hide the menu. Since this component
 * prevents that blur from ever happening (to stay focused per above), the
 * flag never gets consumed here - so it stays stuck, and the *next* genuine
 * blur elsewhere (e.g. clicking a different survey element) gets
 * incorrectly swallowed by it too, leaving the toolbar stuck visible. Fixed
 * by `onOpenChange`: a caller in this situation should use it to run one
 * synchronous, invisible blur+focus cycle on the editor when the picker
 * closes, "flushing" the stale flag without any real focus disruption - see
 * `TiptapToolbar`'s usage.
 */
export function VariablePicker({
  groups,
  onSelect,
  triggerLabel,
  disabled,
  triggerVariant = 'outline',
  onOpenChange,
}: VariablePickerProps) {
  const [open, setOpen] = useState(false)
  const hasEntries = groups.some((group) => group.entries.length > 0)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {triggerVariant === 'ghost' ? (
          <ToolbarButton
            disabled={disabled || !hasEntries}
            title="Insert variable"
          >
            <Variable size={16} />
            {triggerLabel}
          </ToolbarButton>
        ) : (
          <Button
            type="button"
            variant="outline"
            size={triggerLabel ? 'sm' : 'icon'}
            disabled={disabled || !hasEntries}
            title="Insert variable"
            onMouseDown={(e) => {
              // Prevent the browser's default click-to-focus from blurring
              // whatever was focused before this button was clicked (e.g.
              // the adjacent rich-text editor).
              e.preventDefault()
            }}
          >
            <Variable size={16} />
            {triggerLabel}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-80 overflow-y-auto w-72 p-1"
        onOpenAutoFocus={(e) => {
          // Keep focus wherever it already was (the trigger's mousedown
          // guard above kept it on the editor) rather than Radix's default
          // of moving it into the popover content.
          e.preventDefault()
        }}
        onCloseAutoFocus={(e) => {
          // Same reasoning as onOpenAutoFocus - don't yank focus away from
          // wherever `onSelect` already put it when the popover closes.
          e.preventDefault()
        }}
        onMouseDown={(e) => {
          // PopoverContent renders in a Portal, a DOM subtree outside the
          // trigger's own React-tree ancestors, so the trigger's mousedown
          // guard above never sees a mousedown on an item here - guard it
          // separately.
          e.preventDefault()
        }}
      >
        {groups.map(
          (group, groupIndex) =>
            group.entries.length > 0 && (
              <div key={group.label}>
                {groupIndex > 0 && <div className="my-1 h-px bg-border" />}
                <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.icon && <group.icon size={12} className="shrink-0" />}
                  {group.label}
                </div>
                {group.entries.map((entry) => (
                  <button
                    key={entry.path}
                    type="button"
                    className={cn(
                      'flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm',
                      'cursor-pointer outline-none transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus-visible:bg-accent focus-visible:text-accent-foreground',
                    )}
                    onClick={() => {
                      onSelect(entry.path)
                      setOpen(false)
                    }}
                  >
                    <span className="truncate">{entry.label}</span>
                  </button>
                ))}
              </div>
            ),
        )}
      </PopoverContent>
    </Popover>
  )
}
