import React from 'react'

import { ContentEditor } from 'appAdmin/component/ContentEditor'
import { FieldError } from 'component/Form'

import { ContentTypeEditProps } from './ContentTypeEditProps'
import { useContentTextEdit } from './useContentTextEdit'

export const ContentTextEdit: React.FC<ContentTypeEditProps> = ({
  element,
  onFocus,
}) => {
  const {
    langEditing,
    value,
    errors,
    onChange,
    variablePickerGroups,
    contentFormat,
  } = useContentTextEdit(element)

  return (
    <div>
      <ContentEditor
        key={langEditing}
        value={value}
        variant="inline"
        placeholder="Your text here"
        withToolbar={true}
        toolbarExtra={true}
        format={contentFormat}
        variablePickerGroups={variablePickerGroups}
        onChange={onChange}
        onFocus={onFocus}
        onClick={onFocus}
        testId={`content-editor-${element._id}`}
      />
      <FieldError errors={errors} />
    </div>
  )
}
