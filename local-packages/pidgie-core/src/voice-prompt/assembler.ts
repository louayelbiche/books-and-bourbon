/**
 * PromptAssembler: the deterministic pipeline.
 *
 * BlockRegistry → condition check → formatter → concatenate → FactGuard → AssembledPrompt
 */

import type {
  PromptChannel,
  BlockDataInput,
  CallerContext,
  TenantMeta,
  AssembledPrompt,
  AuditEntry,
} from './types';
import { BlockRegistry } from './block-registry';
import { FactGuard } from './fact-guard';

export class PromptAssembler {
  private registry: BlockRegistry;
  private channel: PromptChannel;

  constructor(registry: BlockRegistry, channel: PromptChannel = 'voice') {
    this.registry = registry;
    this.channel = channel;
  }

  /**
   * Assemble a complete prompt from DB data.
   *
   * Pipeline:
   * 1. Get all blocks sorted by order
   * 2. Evaluate each block's condition
   * 3. Format included blocks
   * 4. Concatenate with double-newline
   * 5. Build audit trail
   * 6. Run FactGuard
   * 7. Return AssembledPrompt
   */
  assemble(data: BlockDataInput, caller?: CallerContext): AssembledPrompt {
    const input: BlockDataInput = { ...data, caller: caller || data.caller };
    const blocks = this.registry.getAll();

    const includedBlocks: string[] = [];
    const skippedBlocks: Array<{ name: string; reason: string }> = [];
    const blockTexts: Array<{ name: string; text: string; sources: Array<{ table: string; field: string; rowId: string }> }> = [];

    for (const block of blocks) {
      // Skip chat-only or voice-only blocks
      if (block.name === 'call-rules' && this.channel === 'chat') {
        skippedBlocks.push({ name: block.name, reason: 'chat channel does not include call rules' });
        continue;
      }

      const included = block.condition(input);
      if (!included) {
        skippedBlocks.push({ name: block.name, reason: 'condition returned false (data not present)' });
        continue;
      }

      const formatter = this.channel === 'voice' ? block.formatVoice : block.formatChat;
      const output = formatter(input);

      if (!output.text.trim()) {
        skippedBlocks.push({ name: block.name, reason: 'formatter returned empty text' });
        continue;
      }

      includedBlocks.push(block.name);
      blockTexts.push({ name: block.name, text: output.text, sources: output.sources });
    }

    // Concatenate
    const text = blockTexts.map((b) => b.text).join('\n\n');

    // Build audit trail
    const audit = this.buildAudit(blockTexts);

    // Run FactGuard
    const guard = new FactGuard(input);
    const verification = guard.verify(text, audit);

    return {
      text,
      includedBlocks,
      skippedBlocks,
      audit,
      verification,
      tenantId: data.tenantId,
      assembledAt: new Date(),
    };
  }

  private buildAudit(
    blockTexts: Array<{ name: string; text: string; sources: Array<{ table: string; field: string; rowId: string }> }>
  ): AuditEntry[] {
    const entries: AuditEntry[] = [];
    let lineNumber = 1;

    for (const block of blockTexts) {
      const lines = block.text.split('\n');
      for (const line of lines) {
        entries.push({
          lineNumber,
          text: line,
          sources: block.sources,
          blockName: block.name,
        });
        lineNumber++;
      }
      lineNumber++; // account for the blank line between blocks
    }

    return entries;
  }
}

// ---------------------------------------------------------------------------
// Convenience: parse TenantMeta from raw JSON
// ---------------------------------------------------------------------------

export function parseTenantMeta(metadata: unknown): TenantMeta {
  if (!metadata || typeof metadata !== 'object') return {};
  const raw = metadata as Record<string, unknown>;
  const contact = raw.contact as TenantMeta['contact'] | undefined;
  const address = raw.address as TenantMeta['address'] | undefined;

  return {
    category: raw.category as string | undefined,
    description: raw.description as string | undefined,
    contact: contact || (raw.phone || raw.email ? {
      phone: raw.phone as string | undefined,
      email: raw.email as string | undefined,
      website: raw.website as string | undefined,
    } : undefined),
    address,
    customSystemPrompt: raw.customSystemPrompt as string | undefined,
    leadQualQuestions: raw.leadQualQuestions as string | undefined,
  };
}
