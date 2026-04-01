/**
 * Block Registry: the prompt structure is defined here and sealed at init.
 * No blocks can be added at runtime after sealing.
 */

import type { BlockDefinition } from './types';

export class BlockRegistry {
  private blocks = new Map<string, BlockDefinition>();
  private _sealed = false;

  /** Register a block. Throws if registry is sealed or name is duplicate. */
  register(block: BlockDefinition): void {
    if (this._sealed) {
      throw new Error(`BlockRegistry is sealed. Cannot register block "${block.name}".`);
    }
    if (this.blocks.has(block.name)) {
      throw new Error(`Block "${block.name}" is already registered.`);
    }
    this.blocks.set(block.name, block);
  }

  /** Seal the registry. No more blocks can be added. */
  seal(): void {
    this._sealed = true;
  }

  /** Whether the registry is sealed. */
  isSealed(): boolean {
    return this._sealed;
  }

  /** Get all blocks sorted by order (ascending). */
  getAll(): BlockDefinition[] {
    return Array.from(this.blocks.values()).sort((a, b) => a.order - b.order);
  }

  /** Get a block by name. */
  get(name: string): BlockDefinition | undefined {
    return this.blocks.get(name);
  }

  /** Number of registered blocks. */
  get size(): number {
    return this.blocks.size;
  }
}
