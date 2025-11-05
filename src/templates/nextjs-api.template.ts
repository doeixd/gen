/**
 * Next.js API Routes Template
 * Generates Next.js 13+ API routes with App Router
 */

import type { Entity } from '../entity'
import { getFieldNames } from '../utils'
import { ts, conditional, map } from '../tags'

export interface NextJsAPITemplateOptions {
  entity: Entity<any>
  includeValidation?: boolean
  includeAuth?: boolean
  includePagination?: boolean
  includeFiltering?: boolean
  includeSorting?: boolean
}

export function generateNextJsAPI(options: NextJsAPITemplateOptions): string {
  const {
    entity,
    includeValidation = true,
    includeAuth = false,
    includePagination = true,
    includeFiltering = true,
    includeSorting = true
  } = options
  const entityName = entity.name.singular
  const pluralName = entity.name.plural
  const fields = getFieldNames(entity)

  return ts`
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
${conditional(includeAuth, `import { getServerSession } from 'next-auth'`)}
${conditional(includePagination || includeFiltering || includeSorting, `import { prisma } from '@/lib/prisma'`)}
${conditional(!includePagination && !includeFiltering && !includeSorting, `
// TODO: Import your database client
// import { db } from '@/lib/db'
`)}

// Types
export interface ${entityName} {
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'
  const isOptional = fieldDef.optional
  return `  ${String(field)}${isOptional ? '?' : ''}: ${fieldType}`
})}
}

// Validation schemas
${conditional(includeValidation, `
const ${entityName}Schema = z.object({
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'
  const isOptional = fieldDef.optional

  let zodType: string
  switch (fieldType) {
    case 'string':
      zodType = 'z.string()'
      break
    case 'number':
      zodType = 'z.number()'
      break
    case 'boolean':
      zodType = 'z.boolean()'
      break
    default:
      zodType = 'z.any()'
  }

  if (!isOptional) {
    zodType += `.min(1, '${field} is required')`
  }

  return `  ${String(field)}: ${isOptional ? `z.optional(${zodType})` : zodType},`
})}
})

const create${entityName}Schema = ${entityName}Schema.omit({ id: true })
const update${entityName}Schema = ${entityName}Schema.partial()
`)}
// Query helpers
${conditional(includePagination, `
interface PaginationOptions {
  page?: number
  limit?: number
}

function getPaginationOptions(searchParams: URLSearchParams): PaginationOptions {
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  return { page: Math.max(1, page), limit: Math.max(1, Math.min(100, limit)) }
}
`)}
${conditional(includeFiltering, `
interface FilterOptions {
  search?: string
  [key: string]: any
}

function getFilterOptions(searchParams: URLSearchParams): FilterOptions {
  const filters: FilterOptions = {}

  // Add search filter
  const search = searchParams.get('search')
  if (search) {
    filters.search = search
  }

  // Add field-specific filters
${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'
  return `  const ${String(field)} = searchParams.get('${String(field)}')
  if (${String(field)}) {
    filters.${String(field)} = ${fieldType === 'number' ? `parseInt(${String(field)})` : fieldType === 'boolean' ? `${String(field)} === 'true'` : String(field)}
  }`
})}

  return filters
}
`)}
${conditional(includeSorting, `
interface SortOptions {
  field?: string
  order?: 'asc' | 'desc'
}

function getSortOptions(searchParams: URLSearchParams): SortOptions {
  const field = searchParams.get('sort') || 'createdAt'
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
  return { field, order }
}
`)}
// ===== GET /api/${pluralName} =====
export async function GET(request: NextRequest) {
  try {
${conditional(includeAuth, `
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
`)}
    const { searchParams } = new URL(request.url)

${conditional(includePagination, `    const pagination = getPaginationOptions(searchParams)`)}
${conditional(includeFiltering, `    const filters = getFilterOptions(searchParams)`)}
${conditional(includeSorting, `    const sort = getSortOptions(searchParams)`)}
    // Build query
    let query: any = {}

${conditional(includeFiltering, `
    // Apply filters
    if (filters.search) {
      query.OR = [
${fields.filter(f => entity.fields[f].jsType === 'string').map(f => `        { ${String(f)}: { contains: filters.search, mode: 'insensitive' } },`).join('\n')}
      ]
    }

${map(fields, (field) => {
  const fieldDef = entity.fields[field]
  const fieldType = fieldDef.jsType || 'string'
  if (fieldType !== 'string') {
    return `    if (filters.${String(field)} !== undefined) {
      query.${String(field)} = filters.${String(field)}
    }`
  }
  return ''
}).filter(Boolean).join('\n')}
`)}
${conditional(includeSorting, `
    // Apply sorting
    const orderBy: any = {}
    orderBy[sort.field] = sort.order
`)}
${conditional(includePagination, `
    // Apply pagination
    const skip = (pagination.page - 1) * pagination.limit
    const take = pagination.limit
`)}
    // Execute query
    const [${pluralName}, total] = await Promise.all([
      prisma.${tableName}.findMany({
        where: query,
${conditional(includeSorting, `        orderBy,`)}
${conditional(includePagination, `        skip,
        take,`)}
      }),
      prisma.${tableName}.count({ where: query })
    ])

${conditional(includePagination, `
    const totalPages = Math.ceil(total / pagination.limit)

    return NextResponse.json({
      data: ${pluralName},
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1
      }
    })
`)}
${conditional(!includePagination, `
    return NextResponse.json({ data: ${pluralName}, total })
`)}
  } catch (error) {
    console.error('GET /api/${pluralName} error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ===== POST /api/${pluralName} =====
export async function POST(request: NextRequest) {
  try {
${conditional(includeAuth, `
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
`)}
    const body = await request.json()

${conditional(includeValidation, `
    // Validate input
    const validation = create${entityName}Schema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }
`)}
    // Create ${entityName.toLowerCase()}
    const new${entityName} = await prisma.${tableName}.create({
      data: body
    })

    return NextResponse.json({ data: new${entityName} }, { status: 201 })
  } catch (error) {
    console.error('POST /api/${pluralName} error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ===== Route handlers for individual items =====

// GET /api/${pluralName}/[id]/route.ts
export async function get${entityName}Handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const ${entityName.toLowerCase()} = await prisma.${tableName}.findUnique({
      where: { id }
    })

    if (!${entityName.toLowerCase()}) {
      return NextResponse.json(
        { error: '${entityName} not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: ${entityName.toLowerCase()} })
  } catch (error) {
    console.error('GET /api/${pluralName}/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/${pluralName}/[id]/route.ts
export async function update${entityName}Handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

${conditional(includeValidation, `
    // Validate input
    const validation = update${entityName}Schema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }
`)}
    const updated${entityName} = await prisma.${tableName}.update({
      where: { id },
      data: body
    })

    return NextResponse.json({ data: updated${entityName} })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: '${entityName} not found' },
        { status: 404 }
      )
    }
    console.error('PUT /api/${pluralName}/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/${pluralName}/[id]/route.ts
export async function delete${entityName}Handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    await prisma.${tableName}.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete not found')) {
      return NextResponse.json(
        { error: '${entityName} not found' },
        { status: 404 }
      )
    }
    console.error('DELETE /api/${pluralName}/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ===== Utility functions =====

// Helper to build where clause for filtering
function buildWhereClause(filters: FilterOptions): any {
  const where: any = {}

  if (filters.search) {
    where.OR = [
${fields.filter(f => entity.fields[f].jsType === 'string').map(f => `      { ${String(f)}: { contains: filters.search, mode: 'insensitive' } },`).join('\n')}
    ]
  }

  // Add other filters
  Object.entries(filters).forEach(([key, value]) => {
    if (key !== 'search' && value !== undefined) {
      where[key] = value
    }
  })

  return where
}

// Helper to build orderBy clause for sorting
function buildOrderByClause(sort: SortOptions): any {
  return {
    [sort.field]: sort.order
  }
}
`
}
