import { describe, it, expect } from 'vitest';
import { createEntity } from '../src';

describe('Gen Library', () => {
  it('exports createEntity function', () => {
    expect(typeof createEntity).toBe('function');
  });

  it('can create a basic entity', () => {
    const entity = createEntity({
      id: 'test',
      name: { singular: 'Test', plural: 'Tests' },
      db: {
        table: { name: 'tests', primaryKey: ['id'] },
        columns: {}
      },
      fields: {}
    });

    expect(entity.id).toBe('test');
    expect(entity.name.singular).toBe('Test');
  });
});
