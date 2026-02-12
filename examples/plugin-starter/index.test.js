import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { generateDatabase } from './index.js'

describe('plugin-starter', () => {
  it('writes marker output for database generator', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-plugin-starter-'))

    const args = {
      config: {
        dryRun: false,
        paths: {
          database: tmp,
        },
      },
      entities: [{ id: 'user' }, { id: 'post' }],
    }

    await generateDatabase(args)

    const markerPath = path.join(tmp, 'plugin-starter.marker.json')
    expect(fs.existsSync(markerPath)).toBe(true)

    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf-8'))
    expect(marker.generatedBy).toBe('gen-plugin-starter')
    expect(marker.entityCount).toBe(2)
  })
})
