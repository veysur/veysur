import React from 'react'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { Code, RemoveFormatting } from 'lucide-react'

import {
  VariablePicker,
  VariablePickerGroup,
} from 'appAdmin/component/VariablePicker/VariablePicker'
import { ToolbarButton } from './ToolbarButton'
import { HeadingMenu } from './HeadingMenu'

// TipTap sets an internal `preventHide` flag on any mousedown inside the
// bubble menu, meant to be consumed by exactly one following blur. A Popover
// trigger rendered in here prevents that blur from happening, so the flag
// stays stuck and swallows the *next* genuine blur too, leaving the toolbar
// visible. Flushing it with one synchronous, invisible blur+focus cycle when
// the popover closes clears it. Full explanation in `VariablePicker`'s doc
// comment.
const flushBubbleMenuPreventHide = (editor: Editor, open: boolean) => {
  if (open) return
  if (editor.isFocused) {
    editor.view.dom.blur()
    editor.view.dom.focus()
  }
}

interface TiptapToolbarProps {
  editor: Editor
  toolbarExtra?: boolean
  onOpenSourceEditor: () => void
  /** When provided, adds a variable-picker button that inserts `{{path}}` at
   * the cursor - see `ContentEditor`'s `variablePickerGroups` prop. */
  variablePickerGroups?: VariablePickerGroup[]
  /** Switches the source-editor button between HTML and markdown source
   * editing (see ContentEditor's `sourceModal`). Defaults to 'html'. */
  toolbarVariant?: 'html' | 'markdown'
}

const BUBBLE_MENU_PORTAL_ROOT_ID = 'tiptap-bubble-menu-portal-root'

// A dedicated container to append the bubble menu to via `document.body`
// (escaping the modal's DOM/stacking context) that isn't `document.body`
// itself. TipTap's own blur handling checks whether the newly focused
// element is contained within the menu's parent node to decide whether to
// keep the menu open — if that parent were `document.body`, the check would
// always pass (body contains everything) and the menu would never hide.
const getBubbleMenuPortalRoot = (): HTMLElement => {
  let root = document.getElementById(BUBBLE_MENU_PORTAL_ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = BUBBLE_MENU_PORTAL_ROOT_ID
    document.body.appendChild(root)
  }
  return root
}

export const TiptapToolbar: React.FC<TiptapToolbarProps> = ({
  editor,
  toolbarExtra,
  onOpenSourceEditor,
  variablePickerGroups,
  toolbarVariant = 'html',
}) => {
  return (
    <BubbleMenu
      editor={editor}
      appendTo={getBubbleMenuPortalRoot}
      shouldShow={({ editor }) => editor.isEditable && editor.isFocused}
      getReferencedVirtualElement={() => ({
        // Anchor to the top-left of the editable area itself, not the
        // current text selection - a bubble menu that tracks the cursor
        // covers whatever line the cursor happens to be on (including the
        // field's own first line, or content just above the field), which
        // is disorienting for a toolbar the user expects to find in a
        // stable place. Re-reads the rect on every call (Floating UI calls
        // this on each reposition, e.g. scroll/resize) so it stays correct
        // as the page moves.
        getBoundingClientRect: () => {
          const rect = editor.view.dom.getBoundingClientRect()
          return new DOMRect(rect.left, rect.top, 0, 0)
        },
      })}
      options={{
        placement: 'top-start',
        offset: 8,
        flip: true,
        shift: true,
        strategy: 'fixed',
      }}
      className="tiptap-bubble-menu flex items-center gap-1 p-2 bg-popover border border-border rounded-md shadow-md"
    >
      {toolbarExtra && (
        <>
          <HeadingMenu
            editor={editor}
            onOpenChange={(open) => flushBubbleMenuPreventHide(editor, open)}
          />
          <div className="w-px h-4 bg-border mx-1" />
        </>
      )}

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic"
      >
        <em>I</em>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => {
          const url = window.prompt('Enter URL:')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
        }}
        active={editor.isActive('link')}
        title="Link"
      >
        Link
      </ToolbarButton>

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().clearNodes().unsetAllMarks().run()
        }
        title="Clear Formatting"
      >
        <RemoveFormatting size={16} />
      </ToolbarButton>

      <div className="w-px h-4 bg-border mx-1" />

      <ToolbarButton
        onClick={onOpenSourceEditor}
        title={
          toolbarVariant === 'markdown'
            ? 'Edit Markdown Source'
            : 'Edit HTML Source'
        }
      >
        <Code size={16} />
      </ToolbarButton>

      {variablePickerGroups && (
        <>
          <div className="w-px h-4 bg-border mx-1" />
          <VariablePicker
            groups={variablePickerGroups}
            triggerVariant="ghost"
            onSelect={(path) => {
              // TipTap's `focus()` chain command defers the actual DOM
              // focus via requestAnimationFrame when the editor isn't
              // already focused (see packages/core/src/commands/focus.ts),
              // to avoid racing its own transaction dispatch. Chaining it
              // with insertContent() in one .run() call means the insert's
              // transaction (and the onUpdate it fires) lands *before*
              // that deferred focus - ContentEditor's onUpdate handler gates
              // onChange on isFocusedRef.current, so the insert is
              // silently dropped from the parent's state, and the next
              // blur's "reset to last-known value" effect wipes the
              // visually-inserted text back out. Focusing synchronously
              // via the ProseMirror view first (bypassing the deferred
              // command) ensures onUpdate sees the editor as already
              // focused when insertContent runs.
              if (!editor.isFocused) {
                editor.view.focus()
              }
              editor.chain().insertContent(`{{${path}}}`).run()
            }}
            onOpenChange={(open) => flushBubbleMenuPreventHide(editor, open)}
          />
        </>
      )}
    </BubbleMenu>
  )
}
