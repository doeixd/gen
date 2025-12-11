/**
 * TanStack Table Factory Template
 * Generates shared table infrastructure and utilities
 */

import { ts } from '../tags'

export function generateTanStackTableFactory(): string {
  return ts`
import React from 'react'
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table'

// ===== Table Contexts =====

export const TableContext = React.createContext<any>(null)
export const CellContext = React.createContext<any>(null)

// ===== Column Helper Factory =====

/**
 * Create a type-safe column helper for your entity
 * @example
 * const columnHelper = createAppColumnHelper<User>()
 */
export function createAppColumnHelper<T>() {
  return createColumnHelper<T>()
}

// ===== Pre-configured Table Features =====

/**
 * Reusable table feature models from TanStack Table
 */
export const tableFeatures = {
  core: getCoreRowModel,
  filtered: getFilteredRowModel,
  paginated: getPaginationRowModel,
  sorted: getSortedRowModel,
}

// ===== Default Table Configuration =====

/**
 * Default configuration for tables
 * Can be overridden per-table as needed
 */
export const defaultTableConfig = {
  enableSorting: true,
  enableFiltering: true,
  enablePagination: true,
  enableRowSelection: false,
  enableColumnResizing: false,
  enableMultiSort: false,
  manualPagination: false,
  manualSorting: false,
  manualFiltering: false,
  pageSize: 10,
  pageSizeOptions: [5, 10, 20, 50, 100],
}

/**
 * Helper to merge config with defaults
 */
export function mergeTableConfig(config: Partial<typeof defaultTableConfig>) {
  return { ...defaultTableConfig, ...config }
}
`
}
