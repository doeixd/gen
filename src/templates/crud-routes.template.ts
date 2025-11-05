/**
 * CRUD Routes Template
 * Template for generating complete CRUD routes with TanStack Router
 */

import type { Entity } from '../entity'
import { getFieldNames, getEditableFields } from '../utils'
import { html, conditional, map } from '../tags'

export interface CrudRoutesTemplateOptions {
  entity: Entity<any>
  virtualScrolling?: boolean
  enableSearch?: boolean
  enableSort?: boolean
}

export function generateCrudRoutes(options: CrudRoutesTemplateOptions): string {
  const { entity, virtualScrolling = true, enableSearch = true, enableSort = true } = options
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const tableName = entity.db.table.name
  const fields = getFieldNames(entity)
  const editableFields = getEditableFields(entity)

  return html`
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
${conditional(virtualScrolling, `import { useVirtualizer } from '@tanstack/react-virtual'`)}
import { useState, useRef, useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import pluralize from 'pluralize'

// Import collection and form components
import { ${pluralize.singular(tableName)}Collection } from '~/lib/collections'
import { ${entityName}Form } from '~/components/forms/${entityName}Form'

// Utility functions
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
const generateLabel = (fieldName: string) =>
  fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()

// ===== LIST VIEW =====
export const Route = createFileRoute('/${pluralName}/')({
  component: ${entityName}List,
})

function ${entityName}List() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<keyof ${entityName} | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
${conditional(virtualScrolling, '  const parentRef = useRef<HTMLDivElement>(null)')}

  // Subscribe to collection changes
  const [items, setItems] = useState<${entityName}[]>([])
  useEffect(() => {
    const subscription = ${pluralize.singular(tableName)}Collection.subscribeChanges((changes) => {
      setItems(Array.from(${pluralize.singular(tableName)}Collection.state.values()))
    }, { includeInitialState: true })

    return () => subscription.unsubscribe()
  }, [])

${conditional(enableSearch, `
  // Filter by search
  const filteredItems = items.filter(item => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return ${fields.map(f => `item.${String(f)}?.toString().toLowerCase().includes(searchLower)`).join(' || ')}
  })`)}

${conditional(!enableSearch, '  const filteredItems = items')}

${conditional(enableSort, `
  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortField) return 0
    const aVal = a[sortField]
    const bVal = b[sortField]
    const direction = sortDirection === 'asc' ? 1 : -1
    if (aVal < bVal) return -1 * direction
    if (aVal > bVal) return 1 * direction
    return 0
  })`)}

${conditional(!enableSort, '  const sortedItems = filteredItems')}

${conditional(virtualScrolling, `
  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  })`)}

  if (items.length === 0 && !search) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No ${pluralName} found</h2>
        <p className="text-gray-600 mb-4">Get started by creating your first ${entityName.toLowerCase()}.</p>
        <button
          onClick={() => navigate({ to: '/${pluralName}/create' })}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create ${entityName}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">${pluralName}</h1>
          <p className="text-gray-600 mt-1">Manage your ${pluralName.toLowerCase()}</p>
        </div>
        <button
          onClick={() => navigate({ to: '/${pluralName}/create' })}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create ${entityName}
        </button>
      </div>

${conditional(enableSearch, `
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="search"
            placeholder="Search ${pluralName}..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={sortField || ''}
            onChange={(e) => setSortField(e.target.value as keyof ${entityName} || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">None</option>
${map(fields, (field) => `            <option value="${String(field)}">${generateLabel(String(field))}</option>`)}
          </select>
          {sortField && (
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          )}
        </div>
      </div>`)}

${conditional(virtualScrolling, `
      <div className="bg-white rounded-lg shadow">
        <div ref={parentRef} className="h-[600px] overflow-auto">
          <div style={{ height: \`\${rowVirtualizer.getTotalSize()}px\`, width: '100%', position: 'relative' }}>
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
                  className="flex items-center justify-between px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1" onClick={() => navigate({ to: '/${pluralName}/$id', params: { id: item.id } })}>
                    <div className="font-medium text-gray-900">{item.${String(fields[0])}}</div>
                    <div className="text-sm text-gray-600">
${map(fields.slice(1, 3), (field) => `                      ${String(field)}: {item.${String(field)}}`).join(' • ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate({ to: '/${pluralName}/$id', params: { id: item.id } })}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate({ to: '/${pluralName}/$id/edit', params: { id: item.id } })}
                      className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this ${entityName.toLowerCase()}?')) {
                          const tx = ${pluralize.singular(tableName)}Collection.delete(item.id)
                          tx.isPersisted.promise.then(() => {
                            console.log('${entityName} deleted successfully')
                          }).catch((error) => {
                            console.error('Failed to delete ${entityName}:', error)
                            alert('Failed to delete ${entityName}')
                          })
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>`)}

${conditional(!virtualScrolling, `
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y divide-gray-200">
          {sortedItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1" onClick={() => navigate({ to: '/${pluralName}/$id', params: { id: item.id } })}>
                <div className="font-medium text-gray-900">{item.${String(fields[0])}}</div>
                <div className="text-sm text-gray-600">
${map(fields.slice(1, 3), (field) => `                  ${String(field)}: {item.${String(field)}}`).join(' • ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate({ to: '/${pluralName}/$id', params: { id: item.id } })}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => navigate({ to: '/${pluralName}/$id/edit', params: { id: item.id } })}
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this ${entityName.toLowerCase()}?')) {
                      const tx = ${pluralize.singular(tableName)}Collection.delete(item.id)
                      tx.isPersisted.promise.then(() => {
                        console.log('${entityName} deleted successfully')
                      }).catch((error) => {
                        console.error('Failed to delete ${entityName}:', error)
                        alert('Failed to delete ${entityName}')
                      })
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>`)}

      <div className="text-sm text-gray-600 text-center">
        Showing {sortedItems.length} of {items.length} ${pluralName.toLowerCase()}
      </div>
    </div>
  )
}

// ===== DETAIL VIEW =====
export const DetailRoute = createFileRoute('/${pluralName}/$id')({
  component: ${entityName}Detail,
  loader: ({ params }) => params.id,
})

function ${entityName}Detail() {
  const navigate = useNavigate()
  const { id } = DetailRoute.useParams()
  const [item, setItem] = useState<${entityName} | null>(null)

  useEffect(() => {
    const found = ${pluralize.singular(tableName)}Collection.state.get(id)
    if (found) {
      setItem(found)
    }
  }, [id])

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.966-5.5-2.5" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">${entityName} not found</h2>
        <p className="text-gray-600 mb-4">The ${entityName.toLowerCase()} you're looking for doesn't exist or has been deleted.</p>
        <button
          onClick={() => navigate({ to: '/${pluralName}' })}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to ${pluralName}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{item.${String(fields[0])}}</h1>
          <p className="text-gray-600 mt-1">${entityName} details</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate({ to: '/${pluralName}/$id/edit', params: { id: item.id } })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this ${entityName.toLowerCase()}?')) {
                const tx = ${pluralize.singular(tableName)}Collection.delete(item.id)
                tx.isPersisted.promise.then(() => {
                  navigate({ to: '/${pluralName}' })
                }).catch((error) => {
                  console.error('Failed to delete ${entityName}:', error)
                  alert('Failed to delete ${entityName}')
                })
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
          <button
            onClick={() => navigate({ to: '/${pluralName}' })}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
${map(fields, (field) => `
          <div>
            <dt className="text-sm font-medium text-gray-500">${generateLabel(String(field))}</dt>
            <dd className="mt-1 text-sm text-gray-900">{item.${String(field)}}</dd>
          </div>`)}
        </dl>
      </div>
    </div>
  )
}

// ===== EDIT FORM =====
export const EditRoute = createFileRoute('/${pluralName}/$id/edit')({
  component: ${entityName}Edit,
  loader: ({ params }) => params.id,
})

function ${entityName}Edit() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = EditRoute.useParams()
  const [initialData, setInitialData] = useState<${entityName} | null>(null)

  useEffect(() => {
    const found = ${pluralize.singular(tableName)}Collection.state.get(id)
    if (found) {
      setInitialData(found)
    }
  }, [id])

  if (!initialData) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate({ to: '/${pluralName}/$id', params: { id } })}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit ${entityName}</h1>
          <p className="text-gray-600 mt-1">Update ${entityName.toLowerCase()} information</p>
        </div>
      </div>

      <${entityName}Form
        initialData={initialData}
        onSuccess={(data) => {
          navigate({ to: '/${pluralName}/$id', params: { id: data.id } })
        }}
        onCancel={() => navigate({ to: '/${pluralName}/$id', params: { id } })}
      />
    </div>
  )
}

// ===== CREATE FORM =====
export const CreateRoute = createFileRoute('/${pluralName}/create')({
  component: ${entityName}Create,
})

function ${entityName}Create() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate({ to: '/${pluralName}' })}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create ${entityName}</h1>
          <p className="text-gray-600 mt-1">Add a new ${entityName.toLowerCase()}</p>
        </div>
      </div>

      <${entityName}Form
        onSuccess={(data) => {
          navigate({ to: '/${pluralName}/$id', params: { id: data.id } })
        }}
        onCancel={() => navigate({ to: '/${pluralName}' })}
      />
    </div>
  )
}
`
}
