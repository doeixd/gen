import type { ProjectGenerator } from '@doeixd/gen'

export default {
  id: 'task-docs',
  targets: ['docs'],
  entities: ['task'],
  async generate(ctx) {
    const task = ctx.entities[0]
    if (!task) return []

    return [
      {
        path: 'generated/task-docs.md',
        content: `# ${task.name.plural}\n\nGenerated from project-local .generator.ts`,
      },
    ]
  },
} satisfies ProjectGenerator
