import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'

import { useTheme } from 'component/ThemeProvider'

interface CodeEditorJsProps {
  onChange: (value: string) => void
  value: string
  height?: string
}

export const CodeEditorJs: React.FC<CodeEditorJsProps> = function ({
  onChange,
  value,
  height = '200px',
}) {
  const { theme } = useTheme()

  return (
    <CodeMirror
      className="w-full bg-background text-sm"
      extensions={[javascript()]}
      height={height}
      id="js-code-editor"
      onChange={onChange}
      theme={theme}
      value={value}
    />
  )
}
