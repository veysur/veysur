import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'

import { useTheme } from 'component/ThemeProvider'

interface CodeEditorMarkdownProps {
  onChange: (value: string) => void
  value: string
}

export const CodeEditorMarkdown: React.FC<CodeEditorMarkdownProps> = function ({
  onChange,
  value,
}) {
  const { theme } = useTheme()

  return (
    <CodeMirror
      className="w-full bg-background"
      extensions={[markdown()]}
      height="60vh"
      id="code-editor"
      onChange={onChange}
      theme={theme}
      value={value}
    />
  )
}
