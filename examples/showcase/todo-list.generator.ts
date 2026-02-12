import type { ProjectGenerator } from '@doeixd/gen'

export default {
  id: 'showcase-todo-list-generator',
  description: 'Generate TodoList-focused artifacts from showcase entities',
  targets: ['frontend', 'docs'],
  entities: ['todoList'],
  async generate(ctx) {
    const todoList = ctx.entities.find((e) => e.id === 'todoList')
    if (!todoList) return []

    const fieldNames = Object.keys(todoList.fields)

    return [
      {
        path: 'generated/todo-list/todo-list.meta.generated.ts',
        content: [
          '// Generated from examples/showcase/todo-list.generator.ts',
          `export const TODO_LIST_ENTITY_ID = '${todoList.id}'`,
          `export const TODO_LIST_TABLE = '${todoList.db?.table?.name || 'todo_lists'}'`,
          `export const TODO_LIST_FIELDS = ${JSON.stringify(fieldNames, null, 2)} as const`,
        ].join('\n'),
      },
      {
        path: 'generated/todo-list/todo-list.docs.generated.md',
        content: [
          '# Todo List Entity (Generated)',
          '',
          `- Entity ID: \`${todoList.id}\``,
          `- Table: \`${todoList.db?.table?.name || 'todo_lists'}\``,
          `- Field count: ${fieldNames.length}`,
          '',
          '## Fields',
          ...fieldNames.map((f) => `- \`${f}\``),
        ].join('\n'),
      },
    ]
  },
} satisfies ProjectGenerator
