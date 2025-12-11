/**
 * TanStack Table Template
 * Generates complete table components with TanStack Table v8
 */

import type { Entity } from '../entity'
import { ts, conditional } from '../tags'
import { entityToColumnDefs } from '../helpers'
import { tablePresets, type TablePresetName } from './tanstack-table-presets'

export interface TanStackTableTemplateOptions {
  entity: Entity<any>
  preset?: TablePresetName
  features?: {
    sorting?: boolean
    filtering?: boolean
    pagination?: boolean
    selection?: boolean
    virtualization?: boolean
  }
  permissions?: boolean
  pageSize?: number
}

export function generateTanStackTable(options: TanStackTableTemplateOptions): string {
  const {
    entity,
    preset = 'standard',
    permissions = true,
  } = options

  // Merge preset config with custom features
  const presetConfig = tablePresets[preset]
  const features = { ...presetConfig, ...options.features }
  const pageSize = options.pageSize || ('pageSize' in features ? features.pageSize : 10) || 10

  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name

  // Generate column definitions using the helper
  const columns = entityToColumnDefs(entity, {
    includeActions: true,
    includeSelection: features.selection
  })

  return ts`
import React, { useState, useMemo } from 'react'
import {
  useReactTable,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState
} from '@tanstack/react-table'
${conditional(features.virtualization, "import { useVirtualizer } from '@tanstack/react-virtual'")}
import { useQuery } from '@tanstack/react-query'
${conditional(permissions, "import { usePermissions } from '@/hooks/usePermissions'")}

// Import shared table utilities
import {
  tableFeatures,
  defaultTableConfig
} from './table-factory'

import {
  TextCell,
  NumberCell,
  CurrencyCell,
  DateCell,
  DateTimeCell,
  BadgeCell,
  BooleanCell,
  LinkCell,
  EmailCell,
  ImageCell,
  AvatarCell,
  SortableHeader,
  SelectAllHeader,
  SelectCell,
  createActionsCell,
  EmptyState,
  LoadingState,
  ErrorState,
  PaginationControls
} from './table-components'

// ===== Types =====

export interface ${entityName} {
  id: string
  ${Object.keys(entity.fields).map(field => `${field}: any`).join('\n  ')}
}

export interface ${entityName}TableProps {
  onRowClick?: (item: ${entityName}) => void
  onEdit?: (item: ${entityName}) => void
  onDelete?: (item: ${entityName}) => void
  onCreate?: () => void
  initialFilters?: Record<string, any>
  className?: string
}

// ===== Main Component =====

export function ${entityName}Table(props: ${entityName}TableProps) {
  const { onRowClick, onEdit, onDelete, onCreate, initialFilters = {}, className } = props

  // State
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: ${pageSize},
  })

  ${conditional(permissions, `
  // Permission checks
  const { canRead, canCreate, canUpdate, canDelete } = usePermissions({
    entity: '${pluralName}',
    action: 'list',
  })

  if (!canRead) {
    return <ErrorState error="You don't have permission to view ${pluralName.toLowerCase()}." />
  }
  `)}

  // Data fetching
  const { data, isLoading, error } = useQuery({
    queryKey: ['${tableName}', pagination, sorting, columnFilters, globalFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        ${conditional(features.sorting, "sort: sorting.map(s => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(','),")}
        ...Object.fromEntries(columnFilters.map(f => [f.id, String(f.value)])),
        ...(globalFilter && { search: globalFilter }),
      })

      const response = await fetch(\`/api/${tableName}?\${params}\`)
      if (!response.ok) throw new Error('Failed to fetch data')
      return response.json()
    },
  })

  const items = data?.items || []
  const totalCount = data?.pagination?.total || 0

  // Column definitions
  const columns = useMemo<ColumnDef<${entityName}>[]>(() => ${columns}, [
    ${conditional(permissions, 'canUpdate, canDelete, ')}onRowClick, onEdit, onDelete
  ])

  // Table setup
  const table = useReactTable({
    data: items,
    columns,
    ${conditional(features.sorting, 'onSortingChange: setSorting,')}
    ${conditional(features.filtering, 'onColumnFiltersChange: setColumnFilters,')}
    ${conditional(features.filtering, 'onGlobalFilterChange: setGlobalFilter,')}
    ${conditional(features.pagination, 'onPaginationChange: setPagination,')}
    ${conditional(features.selection, 'onRowSelectionChange: setRowSelection,')}
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: tableFeatures.core(),
    ${conditional(features.filtering, 'getFilteredRowModel: tableFeatures.filtered(),')}
    ${conditional(features.sorting, 'getSortedRowModel: tableFeatures.sorted(),')}
    ${conditional(features.pagination, 'getPaginationRowModel: tableFeatures.paginated(),')}
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: {
      ${conditional(features.sorting, 'sorting,')}
      ${conditional(features.filtering, 'columnFilters,')}
      ${conditional(features.filtering, 'globalFilter,')}
      ${conditional(features.pagination, 'pagination,')}
      ${conditional(features.selection, 'rowSelection,')}
      columnVisibility,
    },
  })

  // Loading state
  if (isLoading) {
    return <LoadingState />
  }

  // Error state
  if (error) {
    return <ErrorState error={(error as Error).message} />
  }

  // Render
  return (
    <div className={\`space-y-4 \${className || ''}\`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">${pluralName}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {totalCount} total {totalCount === 1 ? '${entityName.toLowerCase()}' : '${pluralName.toLowerCase()}'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          ${conditional(permissions, `{canCreate && `)}onCreate && (
            <button
              onClick={onCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create ${entityName}
            </button>
          )${conditional(permissions, `}`)}
          ${conditional(features.selection, `
          {Object.keys(rowSelection).length > 0 && (
            <button
              onClick={() => {
                // Handle bulk delete
                const selectedItems = table.getSelectedRowModel().rows.map(r => r.original)
                console.log('Delete selected:', selectedItems)
                // TODO: Implement bulk delete API call
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Delete Selected ({Object.keys(rowSelection).length})
            </button>
          )}
          `)}
        </div>
      </div>

      ${conditional(features.filtering, `
      {/* Global Filter */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search ${pluralName.toLowerCase()}..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="block w-full max-w-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
        />
      </div>
      `)}

      {/* Table */}
      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => onRowClick?.(row.original)}
                        className={\`\${row.getIsSelected() ? 'bg-blue-50' : ''} \${onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}\`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="px-6 py-4">
                        <EmptyState message="No ${pluralName.toLowerCase()} found." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      ${conditional(features.pagination, `
      {/* Pagination */}
      <PaginationControls table={table} />
      `)}
    </div>
  )
}
`
}
