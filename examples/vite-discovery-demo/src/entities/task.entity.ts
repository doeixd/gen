import { createEntityKit } from '@doeixd/gen'

const k = createEntityKit()

export const entity = k.entity('task', {
  tableName: 'tasks',
  includeTimestamps: true,
  fields: {
    id: k.db.id(),
    title: k.field.string(),
    done: k.field.boolean(),
    ownerId: k.db.ref('users.id').indexed(),
  },
  routes: { api: k.routes.crud('/api/tasks') },
  permissions: k.perm.ownerAdmin('ownerId'),
})
