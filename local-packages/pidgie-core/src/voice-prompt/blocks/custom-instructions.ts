import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';

function format(data: BlockDataInput): BlockOutput {
  return {
    text: data.meta.customSystemPrompt!.trim(),
    sources: [{ table: 'Tenant', field: 'metadata.customSystemPrompt', rowId: data.tenantId }],
  };
}

export const customInstructionsBlock: BlockDefinition = {
  name: 'custom-instructions',
  description: 'Tenant custom system prompt (verbatim). Contains guardrails, pricing, differentiators.',
  order: 15,
  dbSources: [{ table: 'Tenant', fields: ['metadata.customSystemPrompt'] }],
  condition: (data) => !!data.meta.customSystemPrompt?.trim(),
  formatVoice: format,
  formatChat: format,
};
