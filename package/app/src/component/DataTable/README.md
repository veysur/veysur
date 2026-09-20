# DataTable Component

A reusable table component built on shadcn's table primitives with optional row selection functionality and common table features.

## Features

- ✅ **Column-based architecture** - Define columns with render functions
- ✅ **Optional row selection** - Built-in checkbox selection with select-all support
- ✅ **Clickable rows** - Optional row click handlers with visual feedback
- ✅ **Loading states** - Skeleton loading and fetch overlay support
- ✅ **Empty states** - Customizable empty state display
- ✅ **TypeScript support** - Fully typed with generics
- ✅ **Highlight selected rows** - Visual indication of selected items
- ✅ **Responsive** - Built on shadcn table components

## Installation

The component is already available in the project. Import from:

```typescript
import { DataTable } from 'component/DataTable'
import { useSelection } from 'hook'
import type { ColumnDefinition } from 'component/DataTable'
```

Or use individual imports:

```typescript
import { DataTable } from 'component/DataTable/DataTable'
import { useSelection } from 'hook/useSelection'
```

## Basic Usage

### Simple Table (No Selection)

```typescript
import { DataTable } from 'component/DataTable'
import type { ColumnDefinition } from 'component/DataTable'

interface Publication {
  _id: string
  name: string
  created: Date
}

const columns: ColumnDefinition<Publication>[] = [
  {
    key: 'name',
    title: 'Name',
    render: (pub) => pub.name,
  },
  {
    key: 'created',
    title: 'Created',
    render: (pub) => new Date(pub.created).toLocaleDateString(),
  },
]

function PublicationList() {
  const { publications, isLoading } = usePublications()

  return (
    <DataTable
      data={publications}
      columns={columns}
      getRowId={(pub) => pub._id}
      isLoading={isLoading}
    />
  )
}
```

### Table with Row Selection

```typescript
import { DataTable } from 'component/DataTable'
import { useSelection } from 'hook'

function PublicationList() {
  const { publications, isLoading } = usePublications()
  const selection = useSelection()

  return (
    <DataTable
      data={publications}
      columns={columns}
      getRowId={(pub) => pub._id}
      enableSelection
      selection={selection}
      isLoading={isLoading}
    />
  )
}
```

### Table with Clickable Rows

```typescript
import { useNavigate } from 'react-router-dom'

function PublicationList() {
  const navigate = useNavigate()
  const { publications } = usePublications()

  return (
    <DataTable
      data={publications}
      columns={columns}
      getRowId={(pub) => pub._id}
      onRowClick={(pub) => navigate(`/publications/${pub._id}`)}
      clickableRows
    />
  )
}
```

### Complete Example with Selection and Actions

```typescript
import { DataTable } from 'component/DataTable'
import { useSelection } from 'hook'
import { Button } from 'component/shadcn/button'
import { Trash2 } from 'lucide-react'

function PublicationList() {
  const navigate = useNavigate()
  const { publications, isLoading, isFetching } = usePublications()
  const selection = useSelection()

  const handleDelete = async () => {
    const ids = Array.from(selection.selectedIds)
    await deletePublications(ids)
    selection.clearSelection()
  }

  const columns: ColumnDefinition<Publication>[] = [
    {
      key: 'name',
      title: 'Name',
      render: (pub) => pub.name,
    },
    {
      key: 'created',
      title: 'Created',
      render: (pub) => momentTimezone(pub.created).calendar(),
    },
    {
      key: 'actions',
      title: '',
      render: (pub) => <PublicationActionDropdown publication={pub} />,
      className: 'action-menu text-end',
    },
  ]

  return (
    <div className="space-y-4">
      {selection.hasSelection && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selection.getSelectionCount()})
          </Button>
        </div>
      )}

      <DataTable
        data={publications}
        columns={columns}
        getRowId={(pub) => pub._id}
        enableSelection
        selection={selection}
        onRowClick={(pub) => navigate(`/publications/${pub._id}`)}
        isLoading={isLoading}
        isFetching={isFetching}
      />
    </div>
  )
}
```

## API Reference

### DataTable Props

| Prop                 | Type                        | Default                 | Description                                |
| -------------------- | --------------------------- | ----------------------- | ------------------------------------------ |
| `data`               | `TData[]`                   | **required**            | Array of data items to display             |
| `columns`            | `ColumnDefinition<TData>[]` | **required**            | Column definitions                         |
| `getRowId`           | `(row: TData) => string`    | **required**            | Function to extract unique ID from row     |
| `enableSelection`    | `boolean`                   | `false`                 | Enable row selection with checkboxes       |
| `selection`          | `UseSelectionReturn`        | `undefined`             | Selection state from useSelection hook     |
| `onRowClick`         | `(row: TData) => void`      | `undefined`             | Handler for row clicks                     |
| `clickableRows`      | `boolean`                   | `true`                  | Make rows clickable with cursor-pointer    |
| `isLoading`          | `boolean`                   | `false`                 | Show loading skeleton                      |
| `isFetching`         | `boolean`                   | `false`                 | Show loading overlay on existing data      |
| `emptyState`         | `React.ReactNode`           | `<DataTableEmpty />`    | Custom empty state content                 |
| `className`          | `string`                    | `undefined`             | CSS classes for table element              |
| `containerClassName` | `string`                    | `undefined`             | CSS classes for container div              |
| `highlightSelected`  | `boolean`                   | `true`                  | Highlight selected rows with bg color      |
| `preventClickKeys`   | `string[]`                  | `['select', 'actions']` | Column keys that prevent click propagation |

### ColumnDefinition

```typescript
interface ColumnDefinition<TData> {
  key: string // Unique key for column
  title: React.ReactNode | string // Column header content
  render: (row: TData) => React.ReactNode // Cell renderer
  className?: string // CSS classes for cells
  headerClassName?: string // CSS classes for header
  onClick?: (row: TData) => void // Optional cell click handler
}
```

### useSelection Hook

```typescript
const selection = useSelection()

// Returns:
{
  selectedIds: Set<string>           // Set of selected IDs
  selectAll: boolean                 // Select all flag
  toggleSelection: (id: string) => void
  toggleSelectAll: (ids: string[]) => void
  clearSelection: () => void
  hasSelection: boolean              // True if any items selected
  getSelectionCount: () => number | 'all'
}
```

## Common Patterns

### Reset Selection on Page/Filter Change

```typescript
React.useEffect(() => {
  selection.clearSelection()
}, [page, filterValue])
```

### Custom Empty State

```typescript
<DataTable
  data={items}
  columns={columns}
  getRowId={(item) => item._id}
  emptyState={
    <div className="text-center py-8">
      <FileX className="mx-auto h-12 w-12 text-muted-foreground" />
      <p className="mt-2 text-muted-foreground">No publications found</p>
    </div>
  }
/>
```

### Action Column Pattern

```typescript
{
  key: 'actions',
  title: '',
  render: (item) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleEdit(item)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDelete(item)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  className: 'action-menu text-end',
}
```

## Migration from Existing Tables

If you have existing tables using the old pattern, here's how to migrate:

### Before

```typescript
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        {columns.map((col) => (
          <TableHead key={col.key}>{col.title}</TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map((item) => (
        <TableRow key={item._id}>
          {columns.map((col) => (
            <TableCell key={col.key}>
              {col.render(item)}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### After

```typescript
<DataTable
  data={items}
  columns={columns}
  getRowId={(item) => item._id}
/>
```

### Shared Column Factories

For date cells, use `dateColumn` in `columns.tsx` instead of writing the render function inline:

```typescript
import { dateColumn } from 'component/DataTable'

const columns = [
  dateColumn<Survey>({ key: 'created', getDate: (survey) => survey.createdAt }),
]
```

It accepts a `className` override and a `format`/`title` override; see `columns.tsx` for the full signature. An extension adds its own column factories beside its own pages rather than here.

## Notes

- The `select` and `actions` columns automatically prevent click propagation to avoid interfering with row clicks
- Selected rows are highlighted with `bg-muted/70` by default
- The selection column is automatically prepended when `enableSelection={true}`
- The component uses the existing shadcn table components under the hood
