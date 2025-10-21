#!/usr/bin/env node

/**
 * Robust Type-Safe Comprehensive CRUD Generator
 *
 * Production-ready with comprehensive error handling, logging, and validation
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { Result, ok, err } from 'neverthrow';
import pluralize from 'pluralize';
import {
  resolveFieldConfig,
  excludeFromForms,
  excludeFromList,
  tableDisplayConfig,
  routeConfig,
  type FieldMapping,
} from './field-mappings.config.ts';
import {
  readSchemaFile,
  parseSchema,
  type ParsedTable,
  type ParsedField,
} from './utils/schema-parser';
import { zodToCode } from './utils/zod-codegen';
import {
  writeFile,
  ensureDirectory,
  type FileOptions,
} from './utils/file-system';
import {
  DEFAULT_CONFIG,
  parseCliArgs,
  mergeConfig,
  validateConfig,
  generateFileHeader,
  addEslintDisable,
  type GeneratorConfig,
} from './utils/config';
import { logger } from './utils/logger';
import { GeneratorError, GeneratorErrorCode, fromError } from './utils/errors';
import {
  permissionUtils,
  tableDisplayConfig,
  type PermissionConfig,
  type RoutePermissionConfig,
} from './field-mappings.config';

/**
 * Get generator configuration
 */
function getConfig(): Result<GeneratorConfig, GeneratorError> {
  try {
    const cliArgs = parseCliArgs(process.argv.slice(2));
    const config = mergeConfig(DEFAULT_CONFIG, cliArgs);

    const validationResult = validateConfig(config);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    return ok(config);
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.INVALID_CONFIG,
        `Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Generate Zod schema code from field configuration
 */
function generateZodSchemaCode(field: ParsedField, config: GeneratorConfig): Result<string, GeneratorError> {
  return zodToCode(field, {
    includeErrorMessages: config.codegen.includeErrorMessages,
    useStandardSchema: config.codegen.useStandardSchema,
  });
}

/**
 * Utility functions
 */
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
const generateLabel = (fieldName: string) =>
  fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();

/**
 * Generate TypeScript interface
 */
function generateInterface(componentName: string, fields: ParsedField[], includeId = true): string {
  const interfaceFields = fields
    .filter(f => includeId || f.name !== 'id')
    .map(field => {
      let tsType: string;
      switch (field.type) {
        case 'string': case 'id': tsType = 'string'; break;
        case 'number': tsType = 'number'; break;
        case 'boolean': tsType = 'boolean'; break;
        case 'array': tsType = 'any[]'; break;
        default: tsType = 'any';
      }
      const optional = field.isOptional ? '?' : '';
      return `  ${field.name}${optional}: ${tsType};`;
    })
    .join('\n');

  return `export interface ${componentName} {\n${interfaceFields}\n}`;
}

/**
 * Generate List/Table View Component
 */
function generateListView(
  tableName: string,
  fields: ParsedField[],
  config: GeneratorConfig
): Result<string, GeneratorError> {
  const componentName = capitalize(tableName);
  const singularName = capitalize(pluralize.singular(tableName));

  const displayFields = fields.filter(
    f => !excludeFromList.includes(f.name)
  );

  const tableConfig = tableDisplayConfig[tableName] || {};
  const columnsToShow = tableConfig.columns
    ? displayFields.filter(f => tableConfig.columns!.includes(f.name))
    : displayFields;

  // Advanced table features from config
  const enableGlobalFilter = tableConfig.enableGlobalFilter !== false;
  const enablePagination = tableConfig.enablePagination !== false;
  const enableInfiniteScroll = tableConfig.enableVirtualScroll !== false;
  const enableVirtualScroll = tableConfig.enableVirtualScroll !== false;
  const pageSize = tableConfig.pageSize || 20;
  const enableSorting = tableConfig.enableSorting !== false;
  const enableRowSelection = tableConfig.enableRowSelection || false;

  const columnDefs = columnsToShow
    .map(field => {
      const accessor = field.name;
      const header = generateLabel(field.name);
      const customRenderer = tableConfig.customColumnRenderers?.[field.name];

      let cellLogic: string;
      if (customRenderer) {
        // Use custom renderer from tableRenderers
        cellLogic = `return tableRenderers.${customRenderer}(info.getValue())`;
      } else {
        // Default display logic based on field type and config
        const displayComponent = field.config?.displayComponent;
        if (displayComponent === 'Image') {
          cellLogic = `const value = info.getValue()
          // Validate image URL to prevent XSS
          const isValidImageUrl = (url: string) => {
            try {
              const parsed = new URL(url, window.location.origin);
              return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'data:';
            } catch {
              return false;
            }
          };
          return value && isValidImageUrl(value) ? (
            <img
              src={value}
              alt="${header}"
              className="w-12 h-12 object-cover rounded"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-image.png'
              }}
            />
          ) : (
            <span className="text-gray-400">No image</span>
          )`;
        } else if (displayComponent === 'Currency') {
          cellLogic = `const value = info.getValue()
          return <span className="font-mono text-green-600">\`$\${value?.toFixed(2)}\`</span>`;
        } else if (displayComponent === 'Badge') {
          cellLogic = `const value = info.getValue()
          return value ? (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
              Yes
            </span>
          ) : (
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
              No
            </span>
          )`;
        } else {
          cellLogic = `const value = info.getValue()
          return <span className="font-medium text-gray-900">{value}</span>`;
        }
      }

      return `    {
      accessorKey: '${accessor}',
      header: '${header}',
      cell: (info) => {
        ${cellLogic}
      },
      ${tableConfig.sortable?.includes(field.name) ? 'enableSorting: true,' : 'enableSorting: false,'}
    }`;
    })
    .join(',\n');

  try {
    const interfaceDef = generateInterface(singularName, fields);

    const header = generateFileHeader(config, `List view for ${tableName} table`);
    const eslintDisable = addEslintDisable(config);

    const imports = [
      `import { Link, createFileRoute } from '@tanstack/react-router'`,
      enableVirtualScroll ? `import { useVirtualizer } from '@tanstack/react-virtual'` : '',
      `import { useMemo, useEffect, useRef, useState } from 'react'`,
      `import { debounce } from 'lodash-es'`,
      `import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  ${enableSorting ? 'getSortedRowModel,' : ''}
  ${enableGlobalFilter ? 'getFilteredRowModel,' : ''}
  ${enablePagination ? 'getPaginationRowModel,' : ''}
  useReactTable,
  ${enableSorting ? 'type SortingState,' : ''}
  ${enableRowSelection ? 'type RowSelectionState,' : ''}
} from '@tanstack/react-table'`,
      `import { ${tableName}Collection, tableRenderers } from '@/lib/collections'`,
      enableRowSelection ? `import { useBulkOperations } from '@/lib/bulk-operations'` : '',
      `import { useUser } from '@/hooks/useUser'`,
      `import { useWorkOSPermissions } from '@/hooks/useWorkOSPermissions'`,
    ].filter(Boolean).join('\n');

    const component = `${header}${eslintDisable}${imports}

export const Route = createFileRoute('/${tableName}/')({
  component: ${componentName}List,
})

${interfaceDef}

const columnHelper = createColumnHelper<${singularName}>()

const columns = [
${enableRowSelection ? `  columnHelper.display({
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
    ),
  }),` : ''}
${columnDefs},
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => (
      <div className="flex gap-2">
        <Link
          to="/${tableName}/\$id"
          params={{ id: info.row.original.id }}
          className="text-blue-600 hover:underline"
        >
          View
        </Link>
        <Link
          to="/${tableName}/\$id/edit"
          params={{ id: info.row.original.id }}
          className="text-indigo-600 hover:underline"
        >
          Edit
        </Link>
      </div>
    ),
  }),
]

function ${componentName}List() {
  // Ensure user is authenticated
  const user = useUser()

  // Get user permissions from WorkOS
  const { roles: userRoles, canAccess } = useWorkOSPermissions()

  // Check route permissions
  const hasListPermission = canAccess({
    requiredRoles: ${JSON.stringify(tableDisplayConfig[tableName]?.permissions?.list?.read || ['user'])},
    requireOwner: ${tableDisplayConfig[tableName]?.permissions?.list?.owner || false},
  });

  if (!hasListPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  ${enableSorting ? `const [sorting, setSorting] = useState<SortingState>([])` : ''}
  ${enableGlobalFilter ? `const [globalFilter, setGlobalFilter] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // Handle search
  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await ${tableName}Collection.search({
        searchTerm: searchTerm.trim(),
        limit: 50
      })
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce(handleSearch, 300),
    []
  )

  useEffect(() => {
    if (globalFilter) {
      debouncedSearch(globalFilter)
    } else {
      setSearchResults([])
    }
  }, [globalFilter, debouncedSearch])` : ''}
  ${enableRowSelection ? `const [rowSelection, setRowSelection] = useState<RowSelectionState>({})` : ''}
  ${enableInfiniteScroll ? `const [items, setItems] = useState<${singularName}[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)` : `const [items, setItems] = useState<${singularName}[]>([])`}

  // Subscribe to collection changes
  useEffect(() => {
    ${enableInfiniteScroll ? `// Load initial data with pagination
    const loadInitialData = async () => {
      try {
        const result = await ${tableName}Collection.listPaginated({ limit: ${pageSize} })
        setItems(result.page)
        setCursor(result.continueCursor)
        setHasMore(result.hasMore)
      } catch (error) {
        console.error('Failed to load initial data:', error)
      }
    }

    loadInitialData()

    // Subscribe to real-time changes (only for new items)
    const subscription = ${tableName}Collection.subscribeChanges((changes) => {
      // Handle real-time updates for infinite scroll
      setItems(currentItems => {
        const updatedItems = [...currentItems]
        // Apply changes to existing items
        return updatedItems
      })
    })

    return () => subscription.unsubscribe()` : `const subscription = ${tableName}Collection.subscribeChanges(() => {
      setItems(Array.from(${tableName}Collection.state.values()))
    }, { includeInitialState: true })

    return () => subscription.unsubscribe()`}
  }, [])

  ${enableInfiniteScroll ? `// Load more items for infinite scroll
  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const result = await ${tableName}Collection.listPaginated({
        limit: ${pageSize},
        cursor: cursor || undefined
      })

      setItems(currentItems => [...currentItems, ...result.page])
      setCursor(result.continueCursor)
      setHasMore(result.hasMore)
    } catch (error) {
      console.error('Failed to load more data:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Infinite scroll handler
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 100) { // Load more when within 100px of bottom
      loadMore()
    }
  }` : ''}

  const table = useReactTable({
    data: searchResults.length > 0 ? searchResults : items,
    columns,
    state: {
      ${enableSorting ? 'sorting,' : ''}
      ${enableGlobalFilter ? 'globalFilter,' : ''}
      ${enableRowSelection ? 'rowSelection,' : ''}
    },
    ${enableSorting ? 'onSortingChange: setSorting,' : ''}
    ${enableGlobalFilter ? 'onGlobalFilterChange: setGlobalFilter,' : ''}
    ${enableRowSelection ? 'onRowSelectionChange: setRowSelection,' : ''}
    getCoreRowModel: getCoreRowModel(),
    ${enableSorting ? 'getSortedRowModel: getSortedRowModel(),' : ''}
    ${enableGlobalFilter ? 'getFilteredRowModel: getFilteredRowModel(),' : ''}
    ${enablePagination ? 'getPaginationRowModel: getPaginationRowModel(),' : ''}
    ${enablePagination ? `initialState: {
      pagination: {
        pageSize: ${pageSize},
      },
    },` : ''}
  })

  const tableContainerRef = useRef<HTMLDivElement>(null)

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 50,
    overscan: 10,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">${componentName}</h1>
          <Link
            to="/${tableName}/create"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Create ${singularName}
          </Link>
        </div>

        ${enableGlobalFilter ? `{/* Search/Filter Input */}
        <div className="mb-6">
          <label htmlFor="${tableName}-search" className="sr-only">
            Search ${tableName}
          </label>
          <div className="relative">
            <input
              id="${tableName}-search"
              type="search"
              placeholder="Search ${tableName}..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full max-w-md px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Search ${tableName}"
              aria-describedby="${tableName}-search-results"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              </div>
            )}
          </div>
          {searchResults.length > 0 && (
            <p
              id="${tableName}-search-results"
              className="text-sm text-gray-600 mt-1"
              role="status"
              aria-live="polite"
            >
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{globalFilter}"
            </p>
          )}
        </div>` : ''}

        ${enableRowSelection ? `{/* Bulk Actions */}
        {Object.keys(rowSelection).length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {Object.keys(rowSelection).length} item{Object.keys(rowSelection).length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const selectedItems = table.getSelectedRowModel().rows.map(row => row.original)
                    if (confirm(\`Delete \${selectedItems.length} item\${selectedItems.length !== 1 ? 's' : ''}?\`)) {
                      // TODO: Implement bulk delete with proper error handling
                      alert('Bulk delete functionality will be implemented with the bulk operations system')
                    }
                  }}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => {
                    const selectedItems = table.getSelectedRowModel().rows.map(row => row.original)
                    // TODO: Implement bulk export with the export system
                    alert(\`Export \${selectedItems.length} item\${selectedItems.length !== 1 ? 's' : ''} - functionality will be implemented with the export system\`)
                  }}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Export Selected
                </button>
              </div>
            </div>
          </div>
        )}` : ''}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div
            ref={tableContainerRef}
            className="overflow-auto"
            style={{ height: '600px' }}
            ${enableInfiniteScroll ? 'onScroll={handleScroll}' : ''}
            role="region"
            aria-label="${componentName} table"
            tabIndex={0}
          >
            <table className="w-full" role="table" aria-label="${componentName} data">
              <thead className="bg-gray-50 sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-b"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? 'cursor-pointer select-none flex items-center gap-2'
                                : ''
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {{
                              asc: ' 🔼',
                              desc: ' 🔽',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                <tr style={{ height: \`\${rowVirtualizer.getTotalSize()}px\` }}>
                  <td />
                </tr>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  return (
                    <tr
                      key={row.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                      style={{
                        position: 'absolute',
                        transform: \`translateY(\${virtualRow.start}px)\`,
                        width: '100%',
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 text-sm text-gray-700">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            ${enableInfiniteScroll ? `{/* Infinite Scroll Loading Indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}
            {hasMore && !isLoadingMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={loadMore}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Load More
                </button>
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <div className="flex justify-center py-4 text-gray-500">
                No more items to load
              </div>
            )}` : ''}
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t">
            ${enablePagination ? `<div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {table.getFilteredSelectedRowModel().rows.length} of {items.length} item{items.length !== 1 ? 's' : ''}
              </p>

              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="text-sm text-gray-700">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>

                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>` : `<p className="text-sm text-gray-600">
              Showing {items.length} item{items.length !== 1 ? 's' : ''}
            </p>`}
          </div>
         </div>
       </div>
     </div>
  )
}
`;

    return ok(component);
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.CODE_GENERATION_ERROR,
        `Failed to generate ${isEdit ? 'edit' : 'create'} form route for ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { tableName, isEdit },
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Generate Detail View Component
 */
function generateDetailView(
  tableName: string,
  fields: ParsedField[],
  config: GeneratorConfig
): Result<string, GeneratorError> {
  try {
    const componentName = capitalize(tableName);
    const singularName = capitalize(pluralize.singular(tableName));

  const displayFields = fields.filter(f => f.name !== '_id');

  const fieldDisplay = displayFields
    .map(field => {
      const label = generateLabel(field.name);
      let displayLogic = `item.${field.name}`;

      if (field.type === 'boolean') {
        displayLogic = `item.${field.name} ? '✅ Yes' : '❌ No'`;
      } else if (field.type === 'number' && field.name.includes('price')) {
        displayLogic = `\`$\${item.${field.name}?.toFixed(2)}\``;
      }

      return `          <div>
            <dt className="text-sm font-medium text-gray-500">${label}</dt>
            <dd className="mt-1 text-lg text-gray-900">{${displayLogic}}</dd>
          </div>`;
    })
    .join('\n');

    const interfaceDef = generateInterface(singularName, fields);

    const header = generateFileHeader(config, `Detail view for ${tableName} table`);
    const eslintDisable = addEslintDisable(config);

    const component = `${header}${eslintDisable}import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { ${tableName}Collection } from '@/lib/collections'
import { useUser } from '@/hooks/useUser'
import { useWorkOSPermissions } from '@/hooks/useWorkOSPermissions'
import { Errors, type AppResult } from '@/lib/errors'
import { fromPromise } from 'neverthrow'
import { Match } from 'effect'
import { toast } from '@/lib/toast'
import { logger } from '@/lib/logger'

export const Route = createFileRoute('/${tableName}/\$id')({
  component: ${singularName}Detail,
})

${interfaceDef}

function ${singularName}Detail() {
  // Ensure user is authenticated
  const user = useUser()

  const { id } = Route.useParams()
  const navigate = useNavigate()

  // Get user permissions from WorkOS
  const { roles: userRoles, canAccess } = useWorkOSPermissions()

  // Check route permissions
  const hasReadPermission = canAccess({
    requiredRoles: ${JSON.stringify(tableDisplayConfig[tableName]?.permissions?.read?.read || ['user'])},
    requireOwner: ${tableDisplayConfig[tableName]?.permissions?.read?.owner || false},
  });

  if (!hasReadPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Find item in collection
  const item = Array.from(${tableName}Collection.state.values()).find(
    (item: ${singularName}) => item.id === id,
  )

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ${singularName} not found
          </h1>
          <Link
            to="/${tableName}"
            className="text-indigo-600 hover:underline"
          >
            Back to list
          </Link>
        </div>
      </div>
    )
  }

  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    logger.trackAction('delete_${singularName.toLowerCase()}', { id: item.id })

    if (!confirm('Are you sure you want to delete this ${singularName.toLowerCase()}?')) {
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    const endTimer = logger.time('delete_${singularName.toLowerCase()}')

    const result = await fromPromise(
      ${tableName}Collection.delete(item.id).isPersisted.promise,
      (error) => Errors.database('delete', 'Failed to delete ${singularName.toLowerCase()}', {
        id: item.id,
        originalError: error
      })
    )

    endTimer()

    result.match(
      () => {
        setIsDeleting(false)
        logger.info('${singularName} deleted successfully', { id: item.id })
        toast.success('Deleted successfully', '${singularName} has been deleted')
        navigate({ to: '/${tableName}' })
      },
      (error) => {
        setIsDeleting(false)
        logger.logAppError(error, 'Failed to delete ${singularName.toLowerCase()}')
        toast.fromError(error, 'Delete failed')
        setDeleteError(Match.value(error).pipe(
          Match.when({ _tag: 'DatabaseError' }, (e) => \`Database error: \${e.message}\`),
          Match.when({ _tag: 'UnauthorizedError' }, () => 'You are not authorized to delete this item'),
          Match.when({ _tag: 'ForbiddenError' }, () => 'You do not have permission to delete this item'),
          Match.orElse((e) => e.message)
        ))
      }
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link
            to="/${tableName}"
            className="text-indigo-600 hover:underline flex items-center gap-2"
          >
            ← Back to ${componentName}
          </Link>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-3">
              <Link
                to="/${tableName}/\$id/edit"
                params={{ id }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Delete ${singularName.toLowerCase()}"
                aria-busy={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
            {deleteError && (
              <div
                className="px-3 py-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm"
                role="alert"
                aria-live="assertive"
              >
                {deleteError}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            ${singularName} Details
          </h1>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
${fieldDisplay}
          </dl>
        </div>
      </div>
    </div>
  )
}
`;

    return ok(component);
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.CODE_GENERATION_ERROR,
        `Failed to generate detail view for ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { tableName },
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Generate Create/Edit Form Route
 */
function generateFormRoute(
  tableName: string,
  fields: ParsedField[],
  isEdit = false,
  config: GeneratorConfig
): Result<string, GeneratorError> {
  try {
    const componentName = capitalize(tableName);
    const singularName = capitalize(pluralize.singular(tableName));
    const routeName = isEdit ? 'edit' : 'create';

    const header = generateFileHeader(config, `${capitalize(routeName)} form route for ${tableName} table`);
    const eslintDisable = addEslintDisable(config);

    const component = `${header}${eslintDisable}import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { ${singularName}Form } from '@/components/forms/${singularName}Form'
import { ${tableName}Collection } from '@/lib/collections'
import { useUser } from '@/hooks/useUser'
import { useWorkOSPermissions } from '@/hooks/useWorkOSPermissions'

export const Route = createFileRoute('/${tableName}/${isEdit ? '$id/' : ''}${routeName}')({
  component: ${singularName}${capitalize(routeName)},
})

function ${singularName}${capitalize(routeName)}() {
  // Ensure user is authenticated
  const user = useUser()
  const navigate = useNavigate()

  // Get user permissions from WorkOS
  const { roles: userRoles, canAccess } = useWorkOSPermissions()

  // Check route permissions
  const hasFormPermission = canAccess({
    requiredRoles: ${JSON.stringify(tableDisplayConfig[tableName]?.permissions?.[isEdit ? 'update' : 'create']?.[isEdit ? 'update' : 'create'] || ['user'])},
    requireOwner: ${tableDisplayConfig[tableName]?.permissions?.[isEdit ? 'update' : 'create']?.owner || false},
  });

  if (!hasFormPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to ${isEdit ? 'edit' : 'create'} this item.</p>
        </div>
      </div>
    );
  }

  ${isEdit ? `const { id } = Route.useParams()
  const item = Array.from(${tableName}Collection.state.values()).find(
    (item: ${singularName}) => item.id === id,
  )

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ${singularName} not found
          </h1>
          <button
            onClick={() => navigate({ to: '/${tableName}' })}
            className="text-indigo-600 hover:underline"
          >
            Back to list
          </button>
        </div>
      </div>
    )
  }` : ''}

  return (
    <${singularName}Form
      collection={${tableName}Collection}
      ${isEdit ? 'initialData={item}' : ''}
      onSuccess={() => {
        // Toast notification is handled by the form component
        navigate({ to: '/${tableName}' })
      }}
      onCancel={() => navigate({ to: '/${tableName}' })}
      userRoles={userRoles}
      isOwner={${isEdit ? `item.userId === user?.id || item.ownerId === user?.id || item.createdBy === user?.id` : 'true'}}
    />
  )
}
`;

    return ok(component);
  } catch (error) {
    return err(
      new GeneratorError(
        GeneratorErrorCode.CODE_GENERATION_ERROR,
        `Failed to generate ${isEdit ? 'edit' : 'create'} form route for ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { tableName, isEdit },
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Main generation function
 */
/**
 * Generate CRUD routes for all tables
 */
async function generateCrudRoutes(
  tables: Map<string, ParsedTable>,
  config: GeneratorConfig
): Promise<Result<void, GeneratorError>> {
  try {
    logger.section('Generating CRUD Routes');

    // Filter tables based on configuration
    let tablesToProcess = Array.from(tables.entries());

    if (config.mode === 'selective' && config.tables) {
      tablesToProcess = tablesToProcess.filter(([tableName]) =>
        config.tables!.includes(tableName)
      );
    }

    if (config.skipTables) {
      tablesToProcess = tablesToProcess.filter(([tableName]) =>
        !config.skipTables!.includes(tableName)
      );
    }

    logger.info(`Processing ${tablesToProcess.length} table(s)`);

    for (const [tableName, tableData] of tablesToProcess) {
      logger.subsection(`Processing ${tableName}`);

      const routeDir = path.join(config.paths.routes, tableName);

      // Ensure route directory exists
      const dirResult = ensureDirectory(routeDir);
      if (dirResult.isErr()) return err(dirResult.error);

      const fileOptions: FileOptions = {
        overwrite: config.overwrite,
        backup: config.createBackups,
        dryRun: config.dryRun,
      };

      // 1. List View
      if (routeConfig.generateIndex) {
        const listResult = generateListView(tableName, tableData.fields, config);
        if (listResult.isErr()) {
          logger.error(`Failed to generate list view for ${tableName}`, listResult.error.code, {
            tableName,
            error: listResult.error.message
          });
          continue;
        }

        const listPath = path.join(routeDir, `index.${config.files.extension}`);
        const writeListResult = writeFile(listPath, listResult.value, fileOptions);
        if (writeListResult.isErr()) {
          logger.error(`Failed to write list view for ${tableName}`, writeListResult.error.code, {
            filePath: listPath,
            error: writeListResult.error.message
          });
          continue;
        }

        logger.success(`Generated /${tableName}/ (list view)`);
      }

      // 2. Detail View
      if (routeConfig.generateDetail) {
        const detailResult = generateDetailView(tableName, tableData.fields, config);
        if (detailResult.isErr()) {
          logger.error(`Failed to generate detail view for ${tableName}`, detailResult.error.code, {
            tableName,
            error: detailResult.error.message
          });
          continue;
        }

        const detailPath = path.join(routeDir, `$id.${config.files.extension}`);
        const writeDetailResult = writeFile(detailPath, detailResult.value, fileOptions);
        if (writeDetailResult.isErr()) {
          logger.error(`Failed to write detail view for ${tableName}`, writeDetailResult.error.code, {
            filePath: detailPath,
            error: writeDetailResult.error.message
          });
          continue;
        }

        logger.success(`Generated /${tableName}/:id (detail view)`);
      }

      // 3. Edit Form
      if (routeConfig.generateEdit) {
        const editResult = generateFormRoute(tableName, tableData.fields, true, config);
        if (editResult.isErr()) {
          logger.error(`Failed to generate edit form for ${tableName}`, editResult.error.code, {
            tableName,
            error: editResult.error.message
          });
          continue;
        }

        const editDir = path.join(routeDir, '$id');
        const dirResult = ensureDirectory(editDir);
        if (dirResult.isErr()) return err(dirResult.error);

        const editPath = path.join(editDir, `edit.${config.files.extension}`);
        const writeEditResult = writeFile(editPath, editResult.value, fileOptions);
        if (writeEditResult.isErr()) {
          logger.error(`Failed to write edit form for ${tableName}`, writeEditResult.error.code, {
            filePath: editPath,
            error: writeEditResult.error.message
          });
          continue;
        }

        logger.success(`Generated /${tableName}/:id/edit (edit form)`);
      }

      // 4. Create Form
      if (routeConfig.generateCreate) {
        const createResult = generateFormRoute(tableName, tableData.fields, false, config);
        if (createResult.isErr()) {
          logger.error(`Failed to generate create form for ${tableName}`, createResult.error.code, {
            tableName,
            error: createResult.error.message
          });
          continue;
        }

        const createPath = path.join(routeDir, `create.${config.files.extension}`);
        const writeCreateResult = writeFile(createPath, createResult.value, fileOptions);
        if (writeCreateResult.isErr()) {
          logger.error(`Failed to write create form for ${tableName}`, writeCreateResult.error.code, {
            filePath: createPath,
            error: writeCreateResult.error.message
          });
          continue;
        }

        logger.success(`Generated /${tableName}/create (create form)`);
      }

      logger.incrementTables();
    }

    return ok(undefined);
  } catch (error) {
    return err(fromError(error, GeneratorErrorCode.CODE_GENERATION_ERROR));
  }
}

/**
 * Main function with comprehensive error handling
 */
async function main(): Promise<void> {
  try {
    logger.startGeneration();
    logger.section('🚀 Robust Type-Safe CRUD Generator');

    // Get configuration
    const configResult = getConfig();
    if (configResult.isErr()) {
      logger.error('Configuration error', configResult.error.code, {
        error: configResult.error.message
      });
      process.exit(1);
    }

    const config = configResult.value;
    logger.setLevel(config.logLevel);

    if (config.dryRun) {
      logger.info('🔍 DRY RUN MODE - No files will be written');
    }

    // Read and parse schema
    logger.subsection('Reading Schema');
    const schemaContentResult = readSchemaFile(config.paths.schema);
    if (schemaContentResult.isErr()) {
      logger.error('Failed to read schema file', schemaContentResult.error.code, {
        filePath: config.paths.schema,
        error: schemaContentResult.error.message
      });
      process.exit(1);
    }

    const tablesResult = parseSchema(
      schemaContentResult.value,
      (tableName, fieldName, fieldType, isOptional) =>
        resolveFieldConfig(tableName, fieldName, fieldType, isOptional)
    );

    if (tablesResult.isErr()) {
      logger.error('Failed to parse schema', tablesResult.error.code, {
        error: tablesResult.error.message
      });
      process.exit(1);
    }

    const tables = tablesResult.value;
    logger.success(`Parsed ${tables.size} table(s) from schema`);

    // Generate CRUD routes
    const generateResult = await generateCrudRoutes(tables, config);
    if (generateResult.isErr()) {
      logger.error('CRUD generation failed', generateResult.error.code, {
        error: generateResult.error.message
      });
      process.exit(1);
    }

    // Print report
    logger.endGeneration();
    logger.printReport();

    // Print usage information
    if (!config.dryRun && tables.size > 0) {
      console.log('\n📚 Generated Routes:\n');
      for (const tableName of tables.keys()) {
        console.log(`  ${tableName}:`);
        console.log(`    GET    /${tableName}           - List view`);
        console.log(`    GET    /${tableName}/:id       - Detail view`);
        console.log(`    GET    /${tableName}/:id/edit  - Edit form`);
        console.log(`    GET    /${tableName}/create    - Create form`);
        console.log('');
      }
    }

  } catch (error) {
    const genError = fromError(error);
    logger.error('Unexpected error in main function', genError.code, {
      error: genError.message
    });
    process.exit(1);
  }
}

// Run the generator
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
