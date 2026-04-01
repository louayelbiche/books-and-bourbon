import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';
import { formatBookingVoice } from '../formatters/voice';

function formatVoice(data: BlockDataInput): BlockOutput {
  return {
    text: `BOOKING RULES:\n${formatBookingVoice(data.bookingConfig!)}`,
    sources: [{ table: 'BookingConfig', field: 'timezone,autoConfirm,minAdvanceMinutes,maxAdvanceDays', rowId: data.tenantId }],
  };
}

export const bookingBlock: BlockDefinition = {
  name: 'booking',
  description: 'Booking configuration rules',
  order: 70,
  dbSources: [{ table: 'BookingConfig', fields: ['timezone', 'autoConfirm', 'minAdvanceMinutes', 'maxAdvanceDays'] }],
  condition: (data) => data.bookingConfig !== null,
  formatVoice,
  formatChat: formatVoice,
};
