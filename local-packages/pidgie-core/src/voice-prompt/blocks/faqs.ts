import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';

function format(data: BlockDataInput): BlockOutput {
  const lines = data.faqs.map((f) => `Q: ${f.question} A: ${f.answer}`);
  const sources = data.faqs.map((f) => ({
    table: 'FAQ',
    field: 'question,answer',
    rowId: f.id,
  }));
  return {
    text: `FREQUENTLY ASKED QUESTIONS:\n${lines.join('\n')}`,
    sources,
  };
}

export const faqsBlock: BlockDefinition = {
  name: 'faqs',
  description: 'Published FAQ entries (verbatim from DB)',
  order: 50,
  dbSources: [{ table: 'FAQ', fields: ['question', 'answer'] }],
  condition: (data) => data.faqs.length > 0,
  formatVoice: format,
  formatChat: format,
};
