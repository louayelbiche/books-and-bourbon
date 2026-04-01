import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';
import { formatMenuItemVoice } from '../formatters/voice';

function formatVoice(data: BlockDataInput): BlockOutput {
  // Group by category
  const byCategory = new Map<string, typeof data.menuItems>();
  for (const item of data.menuItems) {
    const cat = item.categoryName || 'Other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(item);
  }

  const sections: string[] = [];
  for (const [cat, items] of byCategory) {
    const itemLines = items.map((m) => formatMenuItemVoice(m)).join('. ');
    sections.push(`${cat}: ${itemLines}`);
  }

  const sources = data.menuItems.map((m) => ({
    table: 'MenuItem',
    field: 'name,priceInCents',
    rowId: m.id,
  }));

  return {
    text: `MENU:\n${sections.join('\n')}`,
    sources,
  };
}

export const menuBlock: BlockDefinition = {
  name: 'menu',
  description: 'Menu items grouped by category (restaurant)',
  order: 45,
  dbSources: [{ table: 'MenuItem', fields: ['name', 'priceInCents', 'categoryName'] }],
  condition: (data) => data.menuItems.length > 0,
  formatVoice,
  formatChat: formatVoice,
};
