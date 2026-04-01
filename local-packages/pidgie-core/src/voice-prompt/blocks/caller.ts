import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';

function format(data: BlockDataInput): BlockOutput {
  const caller = data.caller!;
  const parts: string[] = [];

  if (caller.name) {
    parts.push(`The caller is ${caller.name}, a ${caller.status} customer.`);
  } else if (caller.phone) {
    parts.push(`The caller's phone number is ${caller.phone}.`);
    if (caller.status === 'returning') {
      parts.push('This is a returning customer.');
    }
  }

  return {
    text: `CALLER CONTEXT:\n${parts.join(' ')}`,
    sources: caller.name
      ? [{ table: 'Customer', field: 'name,phone', rowId: data.tenantId }]
      : [],
  };
}

export const callerBlock: BlockDefinition = {
  name: 'caller',
  description: 'Returning caller context from Customer table',
  order: 90,
  dbSources: [{ table: 'Customer', fields: ['name', 'phone'] }],
  condition: (data) => data.caller !== null && !!(data.caller.phone || data.caller.name),
  formatVoice: format,
  formatChat: format,
};
