import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';
import { formatServiceVoice } from '../formatters/voice';

function formatVoice(data: BlockDataInput): BlockOutput {
  const lines = data.services.map((s) => formatServiceVoice(s));
  const sources = data.services.map((s) => ({
    table: 'Service',
    field: 'name,priceInCents,durationMinutes',
    rowId: s.id,
  }));
  return {
    text: `SERVICES:\n${lines.join('. ')}`,
    sources,
  };
}

export const servicesBlock: BlockDefinition = {
  name: 'services',
  description: 'Active services with price and duration',
  order: 30,
  dbSources: [{ table: 'Service', fields: ['name', 'priceInCents', 'durationMinutes'] }],
  condition: (data) => data.services.length > 0,
  formatVoice,
  formatChat: formatVoice,
};
