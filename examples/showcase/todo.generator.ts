import type { ProjectGenerator } from '@doeixd/gen'

export default {
  id: 'showcase-todo-generator',
  description: 'Generate Todo-focused artifacts from showcase entities',
  targets: ['frontend', 'docs'],
  entities: ['todo'],
  async generate(ctx) {
    const todo = ctx.entities.find((e) => e.id === 'todo')
    if (!todo) return []

    return [
      {
        path: 'generated/todo/todo.routes.generated.ts',
        content: [
          '// Generated from examples/showcase/todo.generator.ts',
          `export const TODO_API_BASE = '${todo.routes?.api?.basePath || '/api/todos'}'`,
          `export const TODO_LIST_ROUTE = '${typeof todo.routes?.frontend?.listRoute === 'string' ? todo.routes.frontend.listRoute : '/todos'}'`,
          `export const TODO_DETAIL_ROUTE = '${typeof todo.routes?.frontend?.detailRoute === 'string' ? todo.routes.frontend.detailRoute : '/todos/:id'}'`,
        ].join('\n'),
      },
      {
        path: 'generated/todo/todo.fields.generated.ts',
        content: [
          '// Generated from examples/showcase/todo.generator.ts',
          `export const TODO_FIELDS = ${JSON.stringify(Object.keys(todo.fields), null, 2)} as const`,
          `export type TodoFieldName = typeof TODO_FIELDS[number]`,
        ].join('\n\n'),
      },
    ]
  },
} satisfies ProjectGenerator
