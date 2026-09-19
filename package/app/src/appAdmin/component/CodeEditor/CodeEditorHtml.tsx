import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'

import { useTheme } from 'component/ThemeProvider'

interface CodeEditorHtmlProps {
  onChange: (value: string) => void
  value: string
}

export const CodeEditorHtml: React.FC<CodeEditorHtmlProps> = function ({
  onChange,
  value,
}) {
  const { theme } = useTheme()

  return (
    <CodeMirror
      className="w-full bg-background"
      extensions={[html()]}
      height="60vh"
      id="code-editor"
      onChange={onChange}
      theme={theme}
      value={value}
    />
  )
}
