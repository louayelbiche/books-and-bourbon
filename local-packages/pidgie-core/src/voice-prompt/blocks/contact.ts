import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';

function format(data: BlockDataInput): BlockOutput {
  const parts: string[] = [];
  const sources: BlockOutput['sources'] = [];
  const c = data.meta.contact || {};
  const a = data.meta.address;

  if (c.phone) {
    parts.push(`Phone: ${c.phone}`);
    sources.push({ table: 'Tenant', field: 'metadata.contact.phone', rowId: data.tenantId });
  }
  if (c.email) {
    parts.push(`Email: ${c.email}`);
    sources.push({ table: 'Tenant', field: 'metadata.contact.email', rowId: data.tenantId });
  }
  if (c.website) {
    parts.push(`Website: ${c.website}`);
    sources.push({ table: 'Tenant', field: 'metadata.contact.website', rowId: data.tenantId });
  }
  if (a) {
    const addr = a.formatted
      || [a.street, a.city, a.state, a.zip || a.postalCode, a.country].filter(Boolean).join(', ');
    if (addr) {
      parts.push(`Address: ${addr}`);
      sources.push({ table: 'Tenant', field: 'metadata.address', rowId: data.tenantId });
    }
  }

  return {
    text: `CONTACT:\n${parts.join('. ')}`,
    sources,
  };
}

export const contactBlock: BlockDefinition = {
  name: 'contact',
  description: 'Phone, email, website, address',
  order: 60,
  dbSources: [{ table: 'Tenant', fields: ['metadata.contact', 'metadata.address'] }],
  condition: (data) => {
    const c = data.meta.contact;
    return !!(c?.phone || c?.email || c?.website || data.meta.address);
  },
  formatVoice: format,
  formatChat: format,
};
