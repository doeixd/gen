import { createEntityKit } from '@doeixd/gen'

const k = createEntityKit()

export default k.entity('user', {
  tableName: 'users',
  includeTimestamps: true,
  fields: {
    id: k.db.id(),
    email: k.field.email().unique(),
    name: k.field.string(),
  },
  routes: { api: k.routes.crud('/api/users') },
})
