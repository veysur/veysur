import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown, MarkdownStorage } from 'tiptap-markdown'
import beautify from 'js-beautify'
import type { ContentFormat } from 'veysur-common'

import { useLatestRef } from 'hook'
import { cn } from 'common/cn'
import { SourceEditorModal } from './SourceEditorModal'

import { CodeEditorHtml, CodeEditorMarkdown } from '../CodeEditor'
import { TiptapToolbar } from './TiptapToolbar'
import { PlainTextEditor } from './PlainTextEditor'
import { VariablePickerGroup } from '../VariablePicker/VariablePicker'
import { ExpressionPillExtension } from './ExpressionPillExtension'
import {
  EMAIL_PREVIEW_CONTENT_CLASS,
  EMAIL_PREVIEW_CSS,
} from './emailPreviewCss'

// Denylist, not an allowlist: any inline style (colour, font-weight,
// text-decoration, background, spacing, ...) is preserved through the
// editor's parse/serialize round-trip except patterns that are actual CSS
// injection vectors in legacy/quirks-mode renderers.
const UNSAFE_STYLE_PATTERN =
  /expression\s*\(|javascript\s*:|vbscript\s*:|-moz-binding|behavior\s*:/i

const sanitizeStyle = (style: string | null): string | null => {
  if (!style) return null
  return UNSAFE_STYLE_PATTERN.test(style) ? null : style
}

// Preserves the full inline `style` attribute (not just colour) on pasted or
// loaded content, e.g. survey email template buttons styled with
// `<span style="color:#ffffff">` — without this, TipTap's schema has no mark
// for arbitrary inline styles and silently drops them on every round-trip.
const StyledTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          sanitizeStyle(element.getAttribute('style')),
        renderHTML: (attributes: { style?: string | null }) =>
          attributes.style ? { style: attributes.style } : {},
      },
    }
  },
})

// The stock Link extension declares `class` as a mark attribute but never
// reads it from source HTML (no `parseHTML`), so a pasted `class="btn"`
// always falls back to the extension's static default. Reading it here lets
// pasted/loaded link classes and styles survive; links inserted via the
// toolbar (which don't set a class) keep the default fallback styling.
const StyledLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('class'),
        renderHTML: (attributes: { class?: string | null }) =>
          attributes.class
            ? { class: attributes.class }
            : { class: 'text-primary underline' },
      },
      style: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          sanitizeStyle(element.getAttribute('style')),
        renderHTML: (attributes: { style?: string | null }) =>
          attributes.style ? { style: attributes.style } : {},
      },
    }
  },
})

const normalizeHtmlOutput = (html: string): string => {
  const stripped = html.replace(/<p>\s*<\/p>/g, '').trim()
  const closeTagCount = (stripped.match(/<\/p>/g) || []).length
  if (
    closeTagCount === 1 &&
    stripped.startsWith('<p>') &&
    stripped.endsWith('</p>')
  ) {
    return stripped.slice(3, -4)
  }
  return stripped
}

interface ContentEditorProps {
  className?: string
  disabled?: boolean
  focus?: boolean
  placeholder?: string
  testId?: string
  value?: string
  variant?: 'inline' | 'styled'
  withToolbar?: boolean
  toolbarExtra?: boolean
  /** Content format this field's survey/project settings resolve to (see
   * `resolveContentFormat` in veysur-common). Defaults to 'html', preserving
   * existing behaviour for untouched call sites (email templates never pass
   * this prop - they stay always-HTML). 'plain' skips TipTap entirely in
   * favour of `PlainTextEditor`; 'markdown' switches TipTap to markdown
   * source via the `Markdown` extension. */
  format?: ContentFormat
  // Renders the editable content with the same CSS the server wraps saved
  // email bodies in (see emailPreviewCss.ts), so classes like `.btn` render
  // correctly instead of e.g. white button text disappearing against the
  // editor's plain background. Only intended for email template editors.
  emailPreview?: boolean
  /** When provided (and `withToolbar` is true), adds a variable-picker
   * button to the bubble toolbar that inserts a `{{path}}` JS-expression
   * token at the cursor - see `useTextExpressionVariablePicker`. */
  variablePickerGroups?: VariablePickerGroup[]
  onBlur?: (e?: Event) => void
  onClick?: (e?: Event) => void
  onFocus?: (e?: Event) => void
  onChange?: (content: string) => void
}

// Renders the full TipTap instance - used for 'html' and 'markdown' formats.
// 'plain' format is handled entirely by ContentEditorComponent below, without
// ever constructing a TipTap editor.
const RichContentEditorComponent: React.FC<ContentEditorProps> = ({
  className,
  disabled = false,
  focus,
  placeholder,
  testId,
  value = '',
  variant = 'styled',
  withToolbar = false,
  toolbarExtra = false,
  format = 'html',
  emailPreview = false,
  variablePickerGroups,
  onBlur = () => {},
  onClick = () => {},
  onChange = () => {},
  onFocus = () => {},
}) => {
  const editorRef = useRef<TiptapEditor | null>(null)

  const [editorState, setEditorState] = useState({
    isFocused: false,
    sourceModalOpen: false,
  })

  const updateEditorState = useCallback(
    (updates: Partial<typeof editorState>) => {
      setEditorState((prev) => ({ ...prev, ...updates }))
    },
    [],
  )

  // Refs avoid stale closures inside useEditor (deps exclude onChange/isFocused
  // to prevent editor recreation on every prop change).
  const onChangeRef = useLatestRef(onChange)

  const isFocusedRef = useRef(false)

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(normalizeHtmlOutput(newValue))
    },
    [onChange],
  )

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false
    updateEditorState({ isFocused: false })
    onBlur()
  }, [onBlur, updateEditorState])

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true
    updateEditorState({ isFocused: true })
    onFocus()
  }, [onFocus, updateEditorState])

  const openSourceEditor = useCallback(() => {
    updateEditorState({ sourceModalOpen: true })
  }, [updateEditorState])

  const closeSourceEditor = useCallback(() => {
    updateEditorState({ sourceModalOpen: false })
  }, [updateEditorState])

  const isMarkdown = format === 'markdown'

  // Reads the editor's current content in whichever source format this
  // instance is configured for - markdown source via the Markdown
  // extension's storage, or normalized HTML otherwise. tiptap-markdown does
  // not export a `declare module '@tiptap/core'` storage augmentation, so
  // there is no typed alternative to reaching into `storage` directly.
  const getEditorContent = useCallback(
    (editorInstance: TiptapEditor): string => {
      if (isMarkdown) {
        const markdownStorage = editorInstance.storage as unknown as {
          markdown: MarkdownStorage
        }
        return markdownStorage.markdown.getMarkdown()
      }
      return normalizeHtmlOutput(editorInstance.getHTML())
    },
    [isMarkdown],
  )

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          // Disable default heading since we may not need all levels
          heading: toolbarExtra
            ? {
                levels: [1, 2, 3, 4],
              }
            : false,
          // Disable link from StarterKit to avoid duplicates
          link: false,
        }),
        StyledTextStyle,
        StyledLink.configure({
          openOnClick: false,
        }),
        // StarterKit ships no image node, so without this markdown `![alt](url)`
        // (typed, pasted, or loaded via the source editor) is silently dropped
        // on parse and never reaches the stored content. `inline: true` matches
        // both the markdown image spec and prosemirror-markdown's serializer
        // schema, so an image can sit inside a paragraph alongside text.
        Image.configure({ inline: true }),
        Placeholder.configure({
          placeholder: placeholder || '',
        }),
        // Only for fields wired up to the expression-variable picker (the
        // same scope `variablePickerGroups` already gates the toolbar
        // button by) - other ContentEditor consumers (email templates, legal
        // notices) use `{{...}}` for a different, older piping system this
        // extension has no relationship to.
        ...(variablePickerGroups ? [ExpressionPillExtension] : []),
        // Switches content parsing/serialization to markdown source -
        // `content` below is treated as markdown, not HTML, and
        // `editor.storage.markdown.getMarkdown()` reads it back out.
        ...(isMarkdown ? [Markdown.configure({ html: false })] : []),
      ],
      content: value,
      editable: !disabled,
      editorProps: {
        attributes: {
          class: cn(
            'tiptap-editor-content html-content outline-none w-full',
            variant === 'styled' && 'min-h-[60px]',
            emailPreview && EMAIL_PREVIEW_CONTENT_CLASS,
          ),
          ...(testId ? { 'data-testid': testId } : {}),
        },
        handleClick: () => {
          onClick()
        },
      },
      onUpdate: ({ editor }) => {
        if (isFocusedRef.current) {
          onChangeRef.current(getEditorContent(editor))
        }
      },
      onFocus: () => {
        handleFocus()
      },
      onBlur: () => {
        handleBlur()
      },
    },
    // Exclude placeholder — changes to it are handled via the effect below to
    // avoid recreating the editor (and losing focus) on every keystroke.
    [
      toolbarExtra,
      testId,
      variant,
      emailPreview,
      isMarkdown,
      Boolean(variablePickerGroups),
    ],
  )

  useEffect(() => {
    if (!editor) return
    const ext = editor.extensionManager.extensions.find(
      (e) => e.name === 'placeholder',
    )
    if (ext) {
      ext.options.placeholder = placeholder || ''
      editor.view.dispatch(editor.state.tr)
    }
  }, [editor, placeholder])

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    if (editor && focus && !editorState.isFocused) {
      editor.commands.focus()
    }
  }, [editor, focus, editorState.isFocused])

  useEffect(() => {
    if (editor && !editorState.isFocused) {
      const currentContent = getEditorContent(editor)
      if (currentContent !== value) {
        editor.commands.setContent(value)
      }
    }
  }, [editor, value, editorState.isFocused, getEditorContent])

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [editor, disabled])

  // Source editor: HTML source (beautified) in 'html' mode, raw markdown
  // source in 'markdown' mode - 'plain' format never renders TipTap at all
  // (see ContentEditorComponent below), so this only ever applies to the two
  // rich-edit formats.
  const sourceModal = useMemo(
    () =>
      editorState.sourceModalOpen &&
      editor &&
      (isMarkdown ? (
        <SourceEditorModal
          title="Edit Markdown"
          show={true}
          onClose={closeSourceEditor}
        >
          <CodeEditorMarkdown
            value={getEditorContent(editor)}
            onChange={(newValue) => {
              editor.commands.setContent(newValue)
              onChangeRef.current(newValue)
            }}
          />
        </SourceEditorModal>
      ) : (
        <SourceEditorModal
          title="Edit Html"
          show={true}
          onClose={closeSourceEditor}
        >
          <CodeEditorHtml
            value={beautify.html(editor.getHTML())}
            onChange={(newValue) => {
              editor.commands.setContent(newValue)
              handleChange(newValue)
            }}
          />
        </SourceEditorModal>
      )),
    [
      isMarkdown,
      editorState.sourceModalOpen,
      editor,
      closeSourceEditor,
      handleChange,
      getEditorContent,
      onChangeRef,
    ],
  )

  if (!editor) {
    return null
  }

  return (
    <div
      className={cn(
        'tiptap-editor-wrapper w-full',
        variant === 'styled' &&
          'rounded-md border border-input bg-transparent dark:bg-input/30 px-3 py-2 text-base shadow-xs transition-[color,box-shadow] md:text-sm',
        // Email content always renders on a white background in recipients'
        // email clients, which have no dark mode — the editor must match, or
        // dark-theme admins see e.g. dark text on a dark editor background.
        emailPreview && variant === 'styled' && 'bg-white dark:bg-white',
        className,
        variant === 'styled' &&
          !disabled &&
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        variant === 'styled' &&
          disabled &&
          'pointer-events-none cursor-not-allowed opacity-50',
      )}
    >
      {emailPreview && <style>{EMAIL_PREVIEW_CSS}</style>}
      <EditorContent editor={editor} className="w-full" />
      {withToolbar && !editorState.sourceModalOpen && (
        <TiptapToolbar
          editor={editor}
          toolbarExtra={toolbarExtra}
          onOpenSourceEditor={openSourceEditor}
          variablePickerGroups={variablePickerGroups}
          toolbarVariant={isMarkdown ? 'markdown' : 'html'}
        />
      )}
      {sourceModal}
    </div>
  )
}

// Dispatches to a real plain-text control for 'plain' format (no TipTap
// instance is ever constructed - a hidden toolbar would still let TipTap's
// own keyboard shortcuts apply rich formatting) or the full TipTap-based
// editor for 'html'/'markdown'.
const ContentEditorComponent: React.FC<ContentEditorProps> = (props) => {
  if (props.format === 'plain') {
    return (
      <PlainTextEditor
        className={props.className}
        disabled={props.disabled}
        focus={props.focus}
        placeholder={props.placeholder}
        testId={props.testId}
        value={props.value}
        variant={props.variant}
        onBlur={props.onBlur}
        onClick={props.onClick}
        onFocus={props.onFocus}
        onChange={props.onChange}
      />
    )
  }
  return <RichContentEditorComponent {...props} />
}

export const ContentEditor = React.memo(
  ContentEditorComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.className === nextProps.className &&
      prevProps.value === nextProps.value &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.variant === nextProps.variant &&
      prevProps.withToolbar === nextProps.withToolbar &&
      prevProps.toolbarExtra === nextProps.toolbarExtra &&
      prevProps.format === nextProps.format &&
      prevProps.emailPreview === nextProps.emailPreview &&
      prevProps.placeholder === nextProps.placeholder &&
      prevProps.focus === nextProps.focus &&
      prevProps.variablePickerGroups === nextProps.variablePickerGroups &&
      prevProps.onChange === nextProps.onChange
    )
  },
)
