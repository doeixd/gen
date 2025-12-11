/**
 * TanStack Table Presets
 * Pre-configured table setups for common use cases
 */

export interface TablePreset {
  sorting?: boolean
  filtering?: boolean
  pagination?: boolean
  selection?: boolean
  columnResizing?: boolean
  columnVisibility?: boolean
  virtualization?: boolean
  compact?: boolean
  pageSize?: number
  description: string
}

export const tablePresets = {
  basic: {
    sorting: false,
    filtering: false,
    pagination: false,
    selection: false,
    columnResizing: false,
    columnVisibility: false,
    virtualization: false,
    compact: false,
    description: 'Simple data display table with no features'
  },
  standard: {
    sorting: true,
    filtering: false,
    pagination: true,
    selection: false,
    columnResizing: false,
    columnVisibility: false,
    virtualization: false,
    compact: false,
    pageSize: 10,
    description: 'Standard table with sorting and pagination (DEFAULT)'
  },
  advanced: {
    sorting: true,
    filtering: true,
    pagination: true,
    selection: true,
    columnResizing: true,
    columnVisibility: true,
    virtualization: false,
    compact: false,
    pageSize: 20,
    description: 'Full-featured admin table with all capabilities'
  },
  minimal: {
    sorting: false,
    filtering: false,
    pagination: false,
    selection: false,
    columnResizing: false,
    columnVisibility: false,
    virtualization: false,
    compact: true,
    description: 'Ultra-lightweight embedded table'
  },
  dashboard: {
    sorting: true,
    filtering: false,
    pagination: true,
    selection: false,
    columnResizing: false,
    columnVisibility: false,
    virtualization: false,
    compact: true,
    pageSize: 5,
    description: 'Compact dashboard widget with minimal features'
  }
} as const satisfies Record<string, TablePreset>

export type TablePresetName = keyof typeof tablePresets
