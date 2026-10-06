import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { findExpressionTokens } from 'veysur-common'

// Mirrors `component/shadcn/badge.tsx`'s "secondary" variant, but
// `rounded-full` for a true pill shape (Badge itself uses `rounded-md`) and
// `text-xs` for a font smaller than the surrounding prose.
const PILL_CLASS =
  'inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-xs font-mono text-secondary-foreground align-middle'

const expressionPillPluginKey = new PluginKey('expressionPillDecoration')

/**
 * Visually styles every `{{expression}}` token in the editor as a small
 * pill via ProseMirror Decorations - a view-layer-only overlay that is never
 * part of the document model. `editor.getHTML()` (and therefore everything
 * persisted/patched to the server) is completely unaffected by this: the
 * pill exists only in the rendered DOM while editing, so it shows live in
 * the same single editing surface rather than needing a separate read-only
 * preview, without ever risking the styling being saved.
 */
export const ExpressionPillExtension = Extension.create({
  name: 'expressionPillDecoration',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: expressionPillPluginKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = []

            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return

              for (const { start, end } of findExpressionTokens(node.text)) {
                decorations.push(
                  Decoration.inline(pos + start, pos + end, {
                    class: PILL_CLASS,
                  }),
                )
              }
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
