import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  discoverEntityFiles,
  isEntityFilePath,
  normalizeEntityModule,
  validateUniqueEntityIds,
} from '../src/vite/entity-discovery-plugin'

describe('vite entity discovery plugin utilities', () => {
  it('detects entity file paths correctly', () => {
    expect(isEntityFilePath('src/entities/user.entity.ts')).toBe(true)
    expect(isEntityFilePath('src/entities/user.entity.tsx')).toBe(true)
    expect(isEntityFilePath('src/entities/user.ts')).toBe(false)
  })

  it('discovers matching entity files with include/exclude filters', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-discovery-'))
    fs.mkdirSync(path.join(root, 'src/entities'), { recursive: true })
    fs.mkdirSync(path.join(root, 'src/ignore'), { recursive: true })
    fs.writeFileSync(path.join(root, 'src/entities/user.entity.ts'), 'export default {}', 'utf-8')
    fs.writeFileSync(path.join(root, 'src/ignore/skip.entity.ts'), 'export default {}', 'utf-8')

    const files = discoverEntityFiles(root, ['src/**/*.entity.ts'], ['src/ignore/**'])

    expect(files.map((f) => f.replace(/\\/g, '/'))).toEqual([
      path.join(root, 'src/entities/user.entity.ts').replace(/\\/g, '/'),
    ])

    fs.rmSync(root, { recursive: true, force: true })
  })

  it('normalizes module default/entity/entities exports', () => {
    const one = normalizeEntityModule({ default: { id: 'user', db: {}, fields: {} } }, 'a.entity.ts')
    expect(one.entities).toHaveLength(1)

    const two = normalizeEntityModule({ entity: { id: 'post', db: {}, fields: {} } }, 'b.entity.ts')
    expect(two.entities[0].id).toBe('post')

    const three = normalizeEntityModule({ entities: [{ id: 'task', db: {}, fields: {} }] }, 'c.entity.ts')
    expect(three.entities[0].id).toBe('task')
  })

  it('throws for invalid module export shape', () => {
    expect(() => normalizeEntityModule({ default: { nope: true } }, 'x.entity.ts')).toThrow(
      /No valid entity exports/
    )
  })

  it('throws for duplicate entity ids', () => {
    expect(() =>
      validateUniqueEntityIds([
        { id: 'user', __source: 'a.entity.ts' },
        { id: 'user', __source: 'b.entity.ts' },
      ])
    ).toThrow(/Duplicate entity ids/)
  })
})
