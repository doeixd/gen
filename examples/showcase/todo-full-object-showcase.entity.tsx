import * as React from 'react'
import type { Entity } from '@doeixd/gen'
import { dbTypes, validators } from '@doeixd/gen'

/**
 * Full object-style showcase (no DSL).
 *
 * This file demonstrates a broad, explicit entity configuration with:
 * - rich db field coverage
 * - field validation + UI mappings
 * - permissions
 * - relationships
 * - routes
 * - lifecycle hooks
 * - mutation definitions
 *
 * Generic parameters used explicitly:
 * - T: data shape (`Todo` / `TodoList`)
 * - C: field component type (`TodoFieldComponent`)
 * - R: route component type (`TodoRouteComponent`)
 * - E: extension metadata (`TodoEntityExtensions`)
 */

type TodoFieldComponent = React.ComponentType<{
  value?: unknown
  onChange?: (value: unknown) => void
}>
type TodoRouteComponent = React.ComponentType<object>

type Todo = {
  id: string
  title: string
  description?: string
  notes?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  estimateHours?: number
  tags: string[]
  metadata: Record<string, unknown>
  dueDate?: string
  completedAt?: string
  listId: string
  ownerId: string
  orgId?: string
  createdAt: string
  updatedAt?: string
}

type TodoList = {
  id: string
  name: string
  color: string
  ownerId: string
  orgId?: string
  createdAt: string
  updatedAt?: string
}

type TodoEntityExtensions = {
  analytics?: {
    eventPrefix: 'todo'
    trackCompletionLatency: boolean
  }
  featureFlags?: {
    enableNotes: boolean
    enableTagFiltering: boolean
  }
}

// ---------- Inline React components ----------
const TextInput: React.FC<{ value?: string; onChange?: (v: string) => void; placeholder?: string }> = ({
  value = '',
  onChange,
  placeholder,
}) => (
  <input
    value={value}
    onChange={(e) => onChange?.(e.target.value)}
    placeholder={placeholder}
    className="w-full rounded border px-3 py-2"
  />
)

const TextArea: React.FC<{ value?: string; onChange?: (v: string) => void; placeholder?: string }> = ({
  value = '',
  onChange,
  placeholder,
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange?.(e.target.value)}
    placeholder={placeholder}
    className="w-full rounded border px-3 py-2 min-h-[100px]"
  />
)

const NumberInput: React.FC<{ value?: number; onChange?: (v: number) => void }> = ({ value, onChange }) => (
  <input
    type="number"
    value={value ?? ''}
    onChange={(e) => onChange?.(Number(e.target.value))}
    className="rounded border px-2 py-1"
  />
)

const CheckboxInput: React.FC<{ value?: boolean; onChange?: (v: boolean) => void }> = ({
  value = false,
  onChange,
}) => (
  <label className="inline-flex items-center gap-2">
    <input type="checkbox" checked={value} onChange={(e) => onChange?.(e.target.checked)} />
    <span>{value ? 'Completed' : 'Open'}</span>
  </label>
)

const PrioritySelect: React.FC<{ value?: string; onChange?: (v: string) => void }> = ({
  value = 'medium',
  onChange,
}) => (
  <select value={value} onChange={(e) => onChange?.(e.target.value)} className="rounded border px-2 py-1">
    <option value="low">Low</option>
    <option value="medium">Medium</option>
    <option value="high">High</option>
  </select>
)

const DateInput: React.FC<{ value?: string; onChange?: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="date"
    value={value ? value.slice(0, 10) : ''}
    onChange={(e) => onChange?.(e.target.value)}
    className="rounded border px-2 py-1"
  />
)

const Badge: React.FC<{ value?: string | boolean }> = ({ value }) => (
  <span className="inline-block rounded bg-slate-100 px-2 py-1 text-xs">{String(value)}</span>
)

const TodoTitleCell: React.FC<{ value?: string }> = ({ value }) => <strong>{value}</strong>

const TodoPriorityCell: React.FC<{ value?: string }> = ({ value }) => {
  const color = value === 'high' ? 'text-red-700' : value === 'medium' ? 'text-amber-700' : 'text-emerald-700'
  return <span className={color}>{value}</span>
}

const DateCell: React.FC<{ value?: string }> = ({ value }) => <span>{value ? value.slice(0, 10) : '-'}</span>

const ListPage: React.FC = () => <div>Todo List Page</div>
const DetailPage: React.FC = () => <div>Todo Detail Page</div>
const CreatePage: React.FC = () => <div>Create Todo Page</div>
const EditPage: React.FC = () => <div>Edit Todo Page</div>

// ---------- Related entity ----------
export const todoListEntity: Entity<TodoList, React.ComponentType, React.ComponentType> = {
  id: 'todoList',
  name: { singular: 'TodoList', plural: 'TodoLists', display: 'Todo Lists' },
  version: 1,
  createdAt: new Date(),
  db: {
    table: { name: 'todo_lists', primaryKey: ['id'] },
    columns: {
      id: { type: dbTypes.id('uuid') },
      name: { type: dbTypes.string(120), indexed: true },
      color: { type: dbTypes.string(20) },
      ownerId: { type: dbTypes.string(64), indexed: true },
      orgId: { type: dbTypes.string(64), nullable: true, indexed: true },
      createdAt: { type: dbTypes.timestamp(), indexed: true },
      updatedAt: { type: dbTypes.timestamp(), nullable: true },
    },
  },
  fields: {
    id: { jsType: 'string', standardSchema: validators.string() },
    name: { jsType: 'string', standardSchema: validators.stringMin(1) },
    color: { jsType: 'string', standardSchema: validators.stringMin(3) },
    ownerId: { jsType: 'string', standardSchema: validators.string() },
    orgId: { jsType: 'string', standardSchema: validators.optional(validators.string()) },
    createdAt: { jsType: 'string', standardSchema: validators.string() },
    updatedAt: { jsType: 'string', standardSchema: validators.optional(validators.string()) },
  },
  permissions: {
    role: {
      user: { read: true, create: true, update: true },
      admin: { read: true, create: true, update: true, delete: true },
    },
    ownership: { required: true, ownerField: 'ownerId' },
    organization: { enabled: true, orgField: 'orgId' },
  },
}

// ---------- Main showcase entity ----------
export const todoEntity: Entity<Todo, TodoFieldComponent, TodoRouteComponent, TodoEntityExtensions> = {
  id: 'todo',
  name: { singular: 'Todo', plural: 'Todos', display: 'Todos' },
  version: 3,
  createdAt: new Date(),

  db: {
    table: { name: 'todos', primaryKey: ['id'] },
    columns: {
      id: { type: dbTypes.id('uuid') },
      title: { type: dbTypes.string(180), indexed: true },
      description: { type: dbTypes.text(), nullable: true },
      notes: { type: dbTypes.text(), nullable: true },
      completed: { type: dbTypes.boolean(), indexed: true },
      priority: { type: dbTypes.enum(['low', 'medium', 'high']), indexed: true },
      estimateHours: { type: dbTypes.number(), nullable: true },
      tags: { type: dbTypes.array(dbTypes.string(50)) },
      metadata: { type: dbTypes.json<Record<string, unknown>>() },
      dueDate: { type: dbTypes.timestamp(), nullable: true, indexed: true },
      completedAt: { type: dbTypes.timestamp(), nullable: true },
      listId: { type: dbTypes.string(64), indexed: true },
      ownerId: { type: dbTypes.string(64), indexed: true },
      orgId: { type: dbTypes.string(64), nullable: true, indexed: true },
      createdAt: { type: dbTypes.timestamp(), indexed: true },
      updatedAt: { type: dbTypes.timestamp(), nullable: true },
    },
    indexes: [{ name: 'todos_owner_priority_idx', columns: ['ownerId', 'priority'] }],
  },

  fields: {
    id: {
      jsType: 'string',
      standardSchema: validators.string(),
      displayComponent: Badge,
      sortable: true,
    },
    title: {
      jsType: 'string',
      standardSchema: validators.stringMin(1, 'Title is required'),
      inputComponent: (props: { value?: string; onChange?: (v: string) => void }) => (
        <TextInput {...props} placeholder="Write a title..." />
      ),
      displayComponent: TodoTitleCell,
      searchable: true,
      sortable: true,
      filterable: true,
    },
    description: {
      jsType: 'string',
      standardSchema: validators.optional(validators.string()),
      inputComponent: (props: { value?: string; onChange?: (v: string) => void }) => (
        <TextArea {...props} placeholder="Optional details" />
      ),
      displayComponent: ({ value }: { value?: string }) => <span className="text-slate-600">{value || '-'}</span>,
    },
    notes: {
      jsType: 'string',
      standardSchema: validators.optional(validators.string()),
      inputComponent: TextArea,
      displayComponent: ({ value }: { value?: string }) => <em>{value || '-'}</em>,
    },
    completed: {
      jsType: 'boolean',
      standardSchema: validators.boolean,
      inputComponent: CheckboxInput,
      displayComponent: ({ value }: { value?: boolean }) => <Badge value={value ? 'Done' : 'Open'} />,
      sortable: true,
      filterable: true,
    },
    priority: {
      jsType: 'string',
      standardSchema: validators.enum(['low', 'medium', 'high']),
      inputComponent: PrioritySelect,
      displayComponent: TodoPriorityCell,
      sortable: true,
      filterable: true,
    },
    estimateHours: {
      jsType: 'number',
      standardSchema: validators.optional(validators.number),
      inputComponent: NumberInput,
      displayComponent: ({ value }: { value?: number }) => <span>{value ?? '-'}</span>,
      sortable: true,
    },
    tags: {
      jsType: 'array',
      standardSchema: validators.array(validators.string()),
      inputComponent: ({ value, onChange }: { value?: string[]; onChange?: (v: string[]) => void }) => (
        <TextInput
          value={(value || []).join(',')}
          onChange={(v) => onChange?.(v.split(',').map((x) => x.trim()).filter(Boolean))}
          placeholder="comma,separated,tags"
        />
      ),
      displayComponent: ({ value }: { value?: string[] }) => <span>{(value || []).join(', ') || '-'}</span>,
      filterable: true,
    },
    metadata: {
      jsType: 'object',
      standardSchema: validators.object({}),
      inputComponent: ({ value, onChange }: { value?: Record<string, unknown>; onChange?: (v: Record<string, unknown>) => void }) => (
        <TextArea
          value={JSON.stringify(value || {}, null, 2)}
          onChange={(v) => {
            try {
              const parsed = JSON.parse(v)
              onChange?.(parsed)
            } catch {
              // ignore invalid JSON in this showcase
            }
          }}
        />
      ),
      displayComponent: ({ value }: { value?: Record<string, unknown> }) => (
        <code>{JSON.stringify(value || {}, null, 2)}</code>
      ),
    },
    dueDate: {
      jsType: 'string',
      standardSchema: validators.optional(validators.string()),
      inputComponent: DateInput,
      displayComponent: DateCell,
      sortable: true,
      filterable: true,
    },
    completedAt: {
      jsType: 'string',
      standardSchema: validators.optional(validators.string()),
      inputComponent: DateInput,
      displayComponent: DateCell,
      sortable: true,
    },
    listId: {
      jsType: 'string',
      standardSchema: validators.string(),
      inputComponent: TextInput,
      displayComponent: Badge,
      filterable: true,
    },
    ownerId: {
      jsType: 'string',
      standardSchema: validators.string(),
      inputComponent: TextInput,
      displayComponent: Badge,
      filterable: true,
    },
    orgId: {
      jsType: 'string',
      standardSchema: validators.optional(validators.string()),
      inputComponent: TextInput,
      displayComponent: Badge,
      filterable: true,
    },
    createdAt: {
      jsType: 'string',
      standardSchema: validators.string(),
      displayComponent: DateCell,
      sortable: true,
    },
    updatedAt: {
      jsType: 'string',
      standardSchema: validators.optional(validators.string()),
      displayComponent: DateCell,
      sortable: true,
    },
  },

  relationships: {
    list: {
      name: 'list',
      type: 'many-to-one',
      foreignEntity: 'todoList',
      db: {
        foreignKey: {
          localColumn: 'listId',
          foreignColumn: 'id',
          onDelete: 'cascade',
          onUpdate: 'cascade',
          indexed: true,
        },
      },
    },
  },

  permissions: {
    role: {
      user: { read: true, create: true, update: true },
      admin: { read: true, create: true, update: true, delete: true },
    },
    ownership: {
      required: true,
      ownerField: 'ownerId',
    },
    organization: {
      enabled: true,
      orgField: 'orgId',
      allowCrossOrg: false,
    },
    fieldLevel: {
      metadata: {
        read: ['admin'],
        write: ['admin'],
      },
    },
  },

  routes: {
    api: {
      basePath: '/api/todos',
      endpoints: {
        list: { method: 'GET', path: '/' },
        get: { method: 'GET', path: '/:id' },
        create: { method: 'POST', path: '/' },
        update: { method: 'PUT', path: '/:id' },
        delete: { method: 'DELETE', path: '/:id' },
      },
    },
    frontend: {
      listRoute: {
        path: '/todos',
        component: ListPage,
      },
      detailRoute: {
        path: '/todos/:id',
        component: DetailPage,
      },
      createRoute: {
        path: '/todos/new',
        component: CreatePage,
      },
      editRoute: {
        path: '/todos/:id/edit',
        component: EditPage,
      },
    },
  },

  ui: {
    list: ['title', 'priority', 'completed', 'dueDate', 'ownerId'],
    form: ['title', 'description', 'notes', 'priority', 'estimateHours', 'tags', 'dueDate', 'listId'],
    detail: ['title', 'description', 'notes', 'priority', 'completed', 'tags', 'metadata', 'createdAt', 'updatedAt'],
  },

  hooks: {
    beforeCreate: async (_ctx, data) => {
      const next = { ...data }
      if (next.completed && !next.completedAt) {
        next.completedAt = new Date().toISOString()
      }
      return next
    },
    beforeUpdate: async (_ctx, data) => {
      const next = { ...data, updatedAt: new Date().toISOString() }
      if (next.completed && !next.completedAt) {
        next.completedAt = new Date().toISOString()
      }
      return next
    },
  },

  mutations: {
    completeTodo: {
      name: 'completeTodo',
      version: 1,
      operation: 'update',
      inputSchema: validators.object({ id: validators.string() }),
      outputSchema: validators.object({ success: validators.boolean }),
      permission: { roles: ['user', 'admin'] },
      audit: { enabled: true },
    },
    reopenTodo: {
      name: 'reopenTodo',
      version: 1,
      operation: 'update',
      inputSchema: validators.object({ id: validators.string() }),
      outputSchema: validators.object({ success: validators.boolean }),
      permission: { roles: ['user', 'admin'] },
      audit: { enabled: true },
    },
  },

  analytics: {
    eventPrefix: 'todo',
    trackCompletionLatency: true,
  },
  featureFlags: {
    enableNotes: true,
    enableTagFiltering: true,
  },
}

export default [todoListEntity, todoEntity]
