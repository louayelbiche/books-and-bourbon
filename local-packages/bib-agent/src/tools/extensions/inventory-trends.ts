/**
 * InventoryTrends — PoC Extension Tool
 *
 * Demonstrates the extension tool pattern:
 * - Implements BibTool with tier: 'extension'
 * - Reads from ctx.dataContext directly (EC-07)
 * - Blocked in public mode by SecurityModule
 *
 * @see README.md for extension tool conventions
 */

import type { BibTool, BibToolContext, ToolParameterSchema } from '../types.js';

export const inventoryTrendsTool: BibTool = {
  name: 'get_inventory_trends',
  description: 'Analyze product inventory trends over time',
  parameters: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        description: 'Analysis period',
        enum: ['weekly', 'monthly'],
      },
    },
    required: ['period'],
  } satisfies ToolParameterSchema,
  tier: 'extension',

  async execute(args: Record<string, unknown>, ctx: BibToolContext): Promise<unknown> {
    const period = args.period as string;
    const products = ctx.dataContext.products;

    // EC-07: reads from DataContext directly (same data source as core tools)
    if (products.length === 0) {
      return { trends: [], period, message: 'No products configured' };
    }

    const featuredCount = products.filter((p) => p.isFeatured).length;
    const categories = [...new Set(products.map((p) => p.categoryName).filter(Boolean))];

    return {
      period,
      totalProducts: products.length,
      featuredProducts: featuredCount,
      categories,
      message: `${products.length} products across ${categories.length} categories`,
    };
  },
};
