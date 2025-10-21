/**
 * React List View Template
 * Template for generating React list/table components
 */

import type { Entity } from '../entity'
import { getFieldNames } from '../utils'

export interface ReactListTemplateOptions {
  entity: Entity<any>
  virtualScrolling?: boolean
  pagination?: boolean
  enableSearch?: boolean
  enableSort?: boolean
}

export function generateReactListComponent(options: ReactListTemplateOptions): string {
  const { entity, virtualScrolling = true, pagination = false, enableSearch = true, enableSort = true } = options
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name
  const fields = getFieldNames(entity)

  return `\
import { useQuery } from '@tanstack/react-query'
${virtualScrolling ? "import { useVirtualizer } from '@tanstack/react-virtual'" : ''}
import { useState, useRef } from 'react'

export interface ${entityName}ListProps {
  onItemClick?: (item: ${entityName}) => void
  onEdit?: (item: ${entityName}) => void
  onDelete?: (item: ${entityName}) => void
}

export function ${entityName}List({ onItemClick, onEdit, onDelete }: ${entityName}ListProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<keyof ${entityName} | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
${virtualScrolling ? '  const parentRef = useRef<HTMLDivElement>(null)' : ''}

  // Fetch data
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['${tableName}'],
    queryFn: async () => {
      // TODO: Implement data fetching
      return [] as ${entityName}[]
    }
  })

${enableSearch ? `\
  // Filter by search
  const filteredItems = items.filter(item => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return ${fields.map(f => `item.${String(f)}?.toString().toLowerCase().includes(searchLower)`).join(' || ')}
  })
` : '  const filteredItems = items'}

${enableSort ? `\
  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortField) return 0
    const aVal = a[sortField]
    const bVal = b[sortField]
    const direction = sortDirection === 'asc' ? 1 : -1
    if (aVal < bVal) return -1 * direction
    if (aVal > bVal) return 1 * direction
    return 0
  })
` : '  const sortedItems = filteredItems'}

${virtualScrolling ? `\
  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  })
` : ''}

  if (isLoading) return <div>Loading ${pluralName}...</div>
  if (error) return <div>Error loading ${pluralName}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">${pluralName}</h2>
        <div className="text-sm text-gray-600">{sortedItems.length} items</div>
      </div>

${enableSearch ? `\
      <input
        type="search"
        placeholder="Search ${pluralName}..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
      />
` : ''}

${virtualScrolling ? `\
      <div ref={parentRef} className="h-[600px] overflow-auto border rounded-lg">
        <div
          style={{
            height: \`\${rowVirtualizer.getTotalSize()}px\`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = sortedItems[virtualRow.index]
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: \`\${virtualRow.size}px\`,
                  transform: \`translateY(\${virtualRow.start}px)\`,
                }}
                className="flex items-center justify-between px-4 py-2 border-b hover:bg-gray-50"
              >
                <div className="flex-1" onClick={() => onItemClick?.(item)}>
                  {/* Render item fields */}
                  <div className="font-medium">{item.${String(fields[0])}}</div>
                </div>
                <div className="flex gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
` : `\
      <div className="space-y-2">
        {sortedItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-4 py-3 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex-1" onClick={() => onItemClick?.(item)}>
              <div className="font-medium">{item.${String(fields[0])}}</div>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(item)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(item)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
`}
    </div>
  )
}
`
}
