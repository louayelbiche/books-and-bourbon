import { describe, it, expect } from 'vitest';
import { BlockRegistry } from '../../src/voice-prompt/block-registry';
import type { BlockDefinition, BlockDataInput } from '../../src/voice-prompt/types';

function makeBlock(name: string, order: number): BlockDefinition {
  const noop = () => ({ text: '', sources: [] });
  return {
    name,
    description: `Test block ${name}`,
    order,
    dbSources: [],
    condition: () => true,
    formatVoice: noop,
    formatChat: noop,
  };
}

describe('BlockRegistry', () => {
  it('register() stores block by name', () => {
    const reg = new BlockRegistry();
    reg.register(makeBlock('test', 10));
    expect(reg.get('test')).toBeDefined();
    expect(reg.size).toBe(1);
  });

  it('register() throws on duplicate name', () => {
    const reg = new BlockRegistry();
    reg.register(makeBlock('dup', 10));
    expect(() => reg.register(makeBlock('dup', 20))).toThrow('already registered');
  });

  it('seal() prevents further registration', () => {
    const reg = new BlockRegistry();
    reg.register(makeBlock('a', 10));
    reg.seal();
    expect(() => reg.register(makeBlock('b', 20))).toThrow('sealed');
  });

  it('isSealed() reflects state', () => {
    const reg = new BlockRegistry();
    expect(reg.isSealed()).toBe(false);
    reg.seal();
    expect(reg.isSealed()).toBe(true);
  });

  it('getAll() returns blocks sorted by order', () => {
    const reg = new BlockRegistry();
    reg.register(makeBlock('c', 30));
    reg.register(makeBlock('a', 10));
    reg.register(makeBlock('b', 20));
    const all = reg.getAll();
    expect(all.map((b) => b.name)).toEqual(['a', 'b', 'c']);
  });

  it('get() returns undefined for unknown name', () => {
    const reg = new BlockRegistry();
    expect(reg.get('nonexistent')).toBeUndefined();
  });

  it('empty registry getAll() returns empty array', () => {
    const reg = new BlockRegistry();
    expect(reg.getAll()).toEqual([]);
  });

  it('multiple blocks returned in correct order', () => {
    const reg = new BlockRegistry();
    reg.register(makeBlock('z', 200));
    reg.register(makeBlock('m', 50));
    reg.register(makeBlock('a', 1));
    reg.seal();
    expect(reg.getAll().map((b) => b.order)).toEqual([1, 50, 200]);
  });
});
