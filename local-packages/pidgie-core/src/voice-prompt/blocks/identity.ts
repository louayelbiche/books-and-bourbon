import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';

function format(data: BlockDataInput): BlockOutput {
  const parts: string[] = [];
  const sources = [{ table: 'Tenant', field: 'name', rowId: data.tenantId }];

  parts.push(`You are a professional AI receptionist for ${data.tenantName}.`);

  if (data.meta.category) {
    parts.push(`Business type: ${data.meta.category}.`);
    sources.push({ table: 'Tenant', field: 'metadata.category', rowId: data.tenantId });
  }
  if (data.meta.description) {
    parts.push(data.meta.description);
    sources.push({ table: 'Tenant', field: 'metadata.description', rowId: data.tenantId });
  }

  return { text: parts.join('\n'), sources };
}

export const identityBlock: BlockDefinition = {
  name: 'identity',
  description: 'Business name, category, and description',
  order: 10,
  dbSources: [{ table: 'Tenant', fields: ['name', 'metadata.category', 'metadata.description'] }],
  condition: () => true, // always included
  formatVoice: format,
  formatChat: format,
};
