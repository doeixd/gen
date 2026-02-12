import { entities, entityById } from 'virtual:gen/entities'

console.log('Discovered entities:', entities.map((e) => e.id))
console.log('Task entity:', entityById.task)
