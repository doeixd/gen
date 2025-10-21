/**
 * Advanced React Table Template
 * TanStack Table with sorting, filtering, pagination, and permissions
 */

import type { Entity } from '../entity'
import { getFieldNames } from '../utils'

export interface ReactAdvancedTableTemplateOptions {
  entity: Entity<any>
  includeSorting: boolean
  includeFiltering: boolean
  includePagination: boolean
  includeSelection: boolean
  includeVirtualization: boolean
  includePermissions: boolean
  pageSize: number
}

export function generateReactAdvancedTableComponent(options: ReactAdvancedTableTemplateOptions): string {
  const {
    entity,
    includeSorting = true,
    includeFiltering = true,
    includePagination = true,
    includeSelection = true,
    includeVirtualization = false,
    includePermissions = true,
    pageSize = 10
  } = options

  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const fields = getFieldNames(entity)

  const imports = `import React, { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
${includeVirtualization ? "import { useVirtualizer } from '@tanstack/react-virtual'" : ''}
import { useQuery } from '@tanstack/react-query'
${includePermissions ? "import { usePermissions } from '@/hooks/usePermissions'" : ''}
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/ui/loading'
import { ChevronUp, ChevronDown, ChevronsUpDown } from '@/components/ui/icons'`

  const dataFetching = `
// Data fetching with permissions
export interface ${entityName}TableProps {
  onRowClick?: (item: ${entityName}) => void
  onEdit?: (item: ${entityName}) => void
  onDelete?: (item: ${entityName}) => void
  onCreate?: () => void
  initialFilters?: Record<string, any>
  className?: string
}

export function ${entityName}Table({
  onRowClick,
  onEdit,
  onDelete,
  onCreate,
  initialFilters = {},
  className
}: ${entityName}TableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: ${pageSize},
  })

  ${includePermissions ? `// Permission checks
  const { canRead, canCreate, canUpdate, canDelete, canBulkDelete } = usePermissions({
    entity: '${pluralName}',
    action: 'list',
  })

  if (!canRead) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600">You don't have permission to view ${pluralName.toLowerCase()}.</p>
      </div>
    )
  }` : ''}

  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ['${pluralName.toLowerCase()}', pagination, sorting, columnFilters, globalFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        sort: sorting.map(s => \`\${s.id}:\${s.desc ? 'desc' : 'asc'}\`).join(','),
        ...Object.fromEntries(
          columnFilters.map(f => [f.id, f.value as string])
        ),
        ...(globalFilter && { search: globalFilter }),
      })

      const response = await fetch(\`/api/${pluralName.toLowerCase()}?\${params}\`)
      if (!response.ok) throw new Error('Failed to fetch data')
      return response.json()
    },
  })

  const items = data?.items || []
  const totalCount = data?.pagination?.total || 0`

  const columnDefinitions = `
// Column definitions
const columns = useMemo<ColumnDef<${entityName}>[]>(() => [
  ${includeSelection ? `{
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },` : ''}
  ${fields.map(field => `{
    accessorKey: '${String(field)}',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          ${String(field).charAt(0).toUpperCase() + String(field).slice(1)}
          ${includeSorting ? `{
            column.getIsSorted() === 'asc' ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )
          }` : ''}
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue('${String(field)}')
      return <div className="font-medium">{String(value)}</div>
    },
    ${includeFiltering ? `filterFn: 'includesString',` : ''}
  },`).join('\n  ')}
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const item = row.original
      return (
        <div className="flex items-center gap-2">
          {onRowClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRowClick(item)}
            >
              View
            </Button>
          )}
          ${includePermissions ? `{canUpdate && ` : ''}onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item)}
            >
              Edit
            </Button>
          )${includePermissions ? `}` : ''}
          ${includePermissions ? `{canDelete && ` : ''}onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          )${includePermissions ? `}` : ''}
        </div>
      )
    },
    enableSorting: false,
  },
], [${includePermissions ? 'canUpdate, canDelete, ' : ''}onRowClick, onEdit, onDelete])`

  const tableSetup = `
// Table setup
const table = useReactTable({
  data: items,
  columns,
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  onGlobalFilterChange: setGlobalFilter,
  onPaginationChange: setPagination,
  ${includeSelection ? 'onRowSelectionChange: setRowSelection,' : ''}
  getCoreRowModel: getCoreRowModel(),
  ${includeFiltering ? 'getFilteredRowModel: getFilteredRowModel(),' : ''}
  ${includeSorting ? 'getSortedRowModel: getSortedRowModel(),' : ''}
  ${includePagination ? 'getPaginationRowModel: getPaginationRowModel(),' : ''}
  manualPagination: true,
  pageCount: Math.ceil(totalCount / pagination.pageSize),
  state: {
    sorting,
    columnFilters,
    globalFilter,
    pagination,
    ${includeSelection ? 'rowSelection,' : ''}
  },
})`

  const renderTable = `
${includeVirtualization ? `
// Virtualization setup
const parentRef = React.useRef<HTMLDivElement>(null)
const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
  overscan: 5,
})

const virtualRows = rowVirtualizer.getVirtualItems()
const totalSize = rowVirtualizer.getTotalSize()` : ''}

if (isLoading) {
  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner className="h-8 w-8" />
      <span className="ml-2">Loading ${pluralName.toLowerCase()}...</span>
    </div>
  )
}

if (error) {
  return (
    <div className="p-4 text-center">
      <p className="text-red-600">Error loading ${pluralName.toLowerCase()}: {error.message}</p>
    </div>
  )
}

return (
  <div className={\`space-y-4 \${className}\`}>
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">${pluralName}</h2>
        <p className="text-muted-foreground">
          {totalCount} ${totalCount === 1 ? entityName.toLowerCase() : pluralName.toLowerCase()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        ${includePermissions ? `{canCreate && ` : ''}onCreate && (
          <Button onClick={onCreate}>
            Create ${entityName}
          </Button>
        )${includePermissions ? `}` : ''}
        ${includeSelection ? `{Object.keys(rowSelection).length > 0 && canBulkDelete && (
          <Button
            variant="destructive"
            onClick={() => {
              const selectedItems = table.getSelectedRowModel().rows.map(r => r.original)
              // Handle bulk delete
            }}
          >
            Delete Selected ({Object.keys(rowSelection).length})
          </Button>
        )}` : ''}
      </div>
    </div>

    {/* Global Filter */}
    ${includeFiltering ? `<div className="flex items-center gap-2">
      <Input
        placeholder="Search ${pluralName.toLowerCase()}..."
        value={globalFilter ?? ''}
        onChange={(event) => setGlobalFilter(String(event.target.value))}
        className="max-w-sm"
      />
    </div>` : ''}

    {/* Table */}
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          ${includeVirtualization ? `virtualRows.length > 0 ? (
            <div
              ref={parentRef}
              className="h-[600px] overflow-auto"
              style={{ height: '600px' }}
            >
              <div style={{ height: \`\${totalSize}px\`, width: '100%', position: 'relative' }}>
                {virtualRows.map((virtualRow) => {
                  const row = table.getRowModel().rows[virtualRow.index]
                  return (
                    <TableRow
                      key={row.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: \`\${virtualRow.size}px\`,
                        transform: \`translateY(\${virtualRow.start}px)\`,
                      }}
                      className={row.getIsSelected() ? 'bg-muted' : ''}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </div>
            </div>
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )` : `table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={row.getIsSelected() ? 'bg-muted' : ''}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )`}
        </TableBody>
      </Table>
    </div>

    {/* Pagination */}
    ${includePagination ? `<div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Rows per page</p>
        <Select
          value={pagination.pageSize.toString()}
          onValueChange={(value) => {
            table.setPageSize(Number(value))
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <SelectItem key={pageSize} value={pageSize.toString()}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">
          Page {pagination.pageIndex + 1} of {table.getPageCount()}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>` : ''}
  </div>
)
}`

  return `${imports}

${dataFetching}

${columnDefinitions}

${tableSetup}

${renderTable}
}`
}