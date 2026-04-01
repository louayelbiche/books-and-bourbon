import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';
import { formatProductVoice } from '../formatters/voice';

function formatVoice(data: BlockDataInput): BlockOutput {
  const lines = data.products.map((p) => formatProductVoice(p));
  const sources = data.products.map((p) => ({
    table: 'Product',
    field: 'name,priceInCents',
    rowId: p.id,
  }));
  return {
    text: `PRODUCTS:\n${lines.join('. ')}`,
    sources,
  };
}

export const productsBlock: BlockDefinition = {
  name: 'products',
  description: 'Active products with price',
  order: 40,
  dbSources: [{ table: 'Product', fields: ['name', 'priceInCents'] }],
  condition: (data) => data.products.length > 0,
  formatVoice,
  formatChat: formatVoice,
};
