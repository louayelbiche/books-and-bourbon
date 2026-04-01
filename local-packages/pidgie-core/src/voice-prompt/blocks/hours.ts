import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';
import { formatHoursVoice } from '../formatters/voice';

function formatVoice(data: BlockDataInput): BlockOutput {
  const sources = data.hours.map((h) => ({
    table: 'BusinessAvailability',
    field: `dayOfWeek:${h.dayOfWeek}`,
    rowId: data.tenantId,
  }));
  return {
    text: `BUSINESS HOURS:\n${formatHoursVoice(data.hours)}`,
    sources,
  };
}

export const hoursBlock: BlockDefinition = {
  name: 'hours',
  description: 'Business operating hours by day of week',
  order: 20,
  dbSources: [{ table: 'BusinessAvailability', fields: ['dayOfWeek', 'startTime', 'endTime', 'isActive'] }],
  condition: (data) => data.hours.length > 0,
  formatVoice,
  formatChat: formatVoice, // same format for chat
};
