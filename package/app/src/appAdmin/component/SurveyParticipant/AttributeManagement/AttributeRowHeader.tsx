import React from 'react'

type Props = {
  showActions?: boolean
}

export const AttributeRowHeader: React.FC<Props> = ({
  showActions = false,
}) => {
  return (
    <div className="hidden xl:flex items-center gap-2 px-3 py-1 text-xs font-medium text-muted-foreground">
      <div className="h-4 w-4 shrink-0" />
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="w-16 shrink-0">Type</div>
        <div className="w-44 shrink-0">Name</div>
        <div className="w-32 shrink-0">Label</div>
        <div className="flex-1 min-w-0">Description</div>
        <div className="w-24 shrink-0">Example</div>
        <div className="shrink-0 flex gap-2">
          <span className="w-8 text-center">Req.</span>
          <span className="w-8 text-center">Int.</span>
        </div>
      </div>
      {showActions && <div className="w-16 shrink-0" />}
    </div>
  )
}

export default AttributeRowHeader
