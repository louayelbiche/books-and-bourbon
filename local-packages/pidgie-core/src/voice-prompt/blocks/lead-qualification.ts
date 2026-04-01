import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';

function format(data: BlockDataInput): BlockOutput {
  return {
    text: `LEAD QUALIFICATION:\nWhen a caller shows interest, ask these questions: ${data.meta.leadQualQuestions}`,
    sources: [{ table: 'Tenant', field: 'metadata.leadQualQuestions', rowId: data.tenantId }],
  };
}

export const leadQualificationBlock: BlockDefinition = {
  name: 'lead-qualification',
  description: 'Lead qualification questions',
  order: 80,
  dbSources: [{ table: 'Tenant', fields: ['metadata.leadQualQuestions'] }],
  condition: (data) => !!data.meta.leadQualQuestions?.trim(),
  formatVoice: format,
  formatChat: format,
};
