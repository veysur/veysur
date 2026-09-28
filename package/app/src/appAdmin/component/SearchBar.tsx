import React from 'react'
import { Search, X } from 'lucide-react'

import { cn } from '@/common/cn'
import { Input } from 'component/shadcn/input'

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  placeholder?: string
  className?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  placeholder = 'Search...',
  className,
}) => {
  return (
    <div className={cn('relative flex items-center w-64', className)}>
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="[&_input]:h-8 [&_input]:w-full [&_input]:pl-9 [&_input]:pr-8"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => onSearchChange('')}
          className="absolute right-2 p-1 rounded hover:bg-muted"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
