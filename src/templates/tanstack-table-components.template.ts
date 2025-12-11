/**
 * TanStack Table Components Template
 * Generates reusable cell renderer components
 */

import { ts } from '../tags'

export function generateTanStackTableComponents(): string {
  return ts`
import React from 'react'
import type { CellContext, ColumnDef, Row, Table } from '@tanstack/react-table'

// ===== Cell Renderer Components =====

export function TextCell<T>({ getValue }: CellContext<T, unknown>) {
  const value = getValue()
  return <span className="text-sm text-gray-900">{String(value ?? '')}</span>
}

export function NumberCell<T>({ getValue }: CellContext<T, unknown>) {
  const value = getValue() as number
  return <span className="text-sm text-gray-900 tabular-nums">{value?.toLocaleString() ?? '0'}</span>
}

export function CurrencyCell<T>({ getValue, column }: CellContext<T, unknown>) {
  const value = getValue() as number
  const currency = column.columnDef.meta?.currency ?? 'USD'
  return (
    <span className="text-sm text-gray-900 tabular-nums">
      {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value ?? 0)}
    </span>
  )
}

export function DateCell<T>({ getValue, column }: CellContext<T, unknown>) {
  const value = getValue()
  const format = column.columnDef.meta?.dateFormat ?? 'short'
  if (!value) return <span className="text-sm text-gray-400">-</span>

  const date = value instanceof Date ? value : new Date(value as string)

  return (
    <span className="text-sm text-gray-600">
      {date.toLocaleDateString('en-US', { dateStyle: format as any })}
    </span>
  )
}

export function DateTimeCell<T>({ getValue }: CellContext<T, unknown>) {
  const value = getValue()
  if (!value) return <span className="text-sm text-gray-400">-</span>

  const date = value instanceof Date ? value : new Date(value as string)

  return (
    <span className="text-sm text-gray-600">
      {date.toLocaleString('en-US')}
    </span>
  )
}

export function BadgeCell<T>({ getValue, column }: CellContext<T, unknown>) {
  const value = getValue()
  const badgeMap = column.columnDef.meta?.badgeMap ?? {}
  const badge = badgeMap[String(value)] ?? { label: String(value), color: 'gray' }

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    purple: 'bg-purple-100 text-purple-800',
    pink: 'bg-pink-100 text-pink-800',
  }

  return (
    <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${colorClasses[badge.color] || colorClasses.gray}\`}>
      {badge.label}
    </span>
  )
}

export function BooleanCell<T>({ getValue }: CellContext<T, unknown>) {
  const value = getValue() as boolean

  return value ? (
    <span className="inline-flex items-center text-green-600">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    </span>
  ) : (
    <span className="inline-flex items-center text-gray-400">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    </span>
  )
}

export function LinkCell<T>({ getValue, row, column }: CellContext<T, unknown>) {
  const value = getValue()
  const href = column.columnDef.meta?.href ? column.columnDef.meta.href(row.original) : \`#\${value}\`

  return (
    <a href={href} className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
      {String(value)}
    </a>
  )
}

export function EmailCell<T>({ getValue }: CellContext<T, unknown>) {
  const value = getValue() as string

  return (
    <a href={\`mailto:\${value}\`} className="text-blue-600 hover:text-blue-800 hover:underline text-sm">
      {value}
    </a>
  )
}

export function ImageCell<T>({ getValue, column }: CellContext<T, unknown>) {
  const value = getValue() as string
  const alt = column.columnDef.meta?.alt ?? 'Image'

  return (
    <img src={value} alt={alt} className="h-10 w-10 rounded-full object-cover" />
  )
}

export function AvatarCell<T>({ getValue, row, column }: CellContext<T, unknown>) {
  const value = getValue() as string
  const nameField = column.columnDef.meta?.nameField
  const name = nameField ? (row.original as any)[nameField] : ''

  return (
    <div className="flex items-center">
      <img src={value} alt={String(name)} className="h-8 w-8 rounded-full object-cover" />
      {name && <span className="ml-2 text-sm text-gray-900">{String(name)}</span>}
    </div>
  )
}

export function SelectCell<T>({ row }: CellContext<T, unknown>) {
  return (
    <input
      type="checkbox"
      checked={row.getIsSelected()}
      onChange={row.getToggleSelectedHandler()}
      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  )
}

// ===== Header Components =====

export function SortableHeader({ column, label }: { column: any; label: string }) {
  const sorted = column.getIsSorted()

  return (
    <button
      onClick={column.getToggleSortingHandler()}
      className="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700"
    >
      {label}
      {sorted === 'asc' && <span>↑</span>}
      {sorted === 'desc' && <span>↓</span>}
      {!sorted && <span className="text-gray-400">↕</span>}
    </button>
  )
}

export function SelectAllHeader<T>({ table }: { table: Table<T> }) {
  return (
    <input
      type="checkbox"
      checked={table.getIsAllRowsSelected()}
      indeterminate={table.getIsSomeRowsSelected()}
      onChange={table.getToggleAllRowsSelectedHandler()}
      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  )
}

// ===== Action Components =====

interface ActionConfig<T> {
  onView?: (row: T) => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  custom?: Array<{
    label: string
    onClick: (row: T) => void
    icon?: React.ReactNode
    className?: string
  }>
}

export function createActionsCell<T>(config: ActionConfig<T>): ColumnDef<T> {
  return {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {config.onView && (
          <button
            onClick={() => config.onView!(row.original)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View
          </button>
        )}
        {config.onEdit && (
          <button
            onClick={() => config.onEdit!(row.original)}
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            Edit
          </button>
        )}
        {config.onDelete && (
          <button
            onClick={() => config.onDelete!(row.original)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        )}
        {config.custom?.map((action, i) => (
          <button
            key={i}
            onClick={() => action.onClick(row.original)}
            className={\`text-sm \${action.className || 'text-gray-600 hover:text-gray-800'}\`}
          >
            {action.icon} {action.label}
          </button>
        ))}
      </div>
    ),
    enableSorting: false,
    enableFiltering: false
  } as ColumnDef<T>
}

// ===== Utility Components =====

export function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="text-center py-12">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
    </div>
  )
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-sm text-gray-600">Loading...</span>
    </div>
  )
}

export function ErrorState({ error }: { error: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      </div>
    </div>
  )
}

export function PaginationControls<T>({ table }: { table: Table<T> }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing page <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span> of{' '}
            <span className="font-medium">{table.getPageCount()}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
          >
            ««
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
          >
            Next
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
          >
            »»
          </button>
        </div>
      </div>
    </div>
  )
}
`
}
