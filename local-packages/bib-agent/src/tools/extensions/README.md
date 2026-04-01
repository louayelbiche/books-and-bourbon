# Extension Tools

Extension tools are third-tier BibTools that add optional capabilities beyond the core and domain tiers. They follow the same `BibTool` interface but are registered separately and subject to additional security constraints.

## Creating an Extension Tool

Implement the `BibTool` interface with `tier: 'extension'`:

```typescript
import type { BibTool, BibToolContext } from '../types.js';

export const myExtensionTool: BibTool = {
  name: 'verb_noun',           // e.g., 'get_inventory_trends'
  description: 'What this tool does',
  parameters: {
    type: 'object',
    properties: { /* ... */ },
    required: [],
  },
  tier: 'extension',

  async execute(args: Record<string, unknown>, ctx: BibToolContext): Promise<unknown> {
    // Implementation here
    return { /* result */ };
  },
};
```

## Registering an Extension Tool

```typescript
import { ToolRegistry } from '../registry.js';
import { myExtensionTool } from './my-extension.js';

ToolRegistry.getInstance().register(myExtensionTool);
```

## Naming Conventions

- Use `verb_noun` format: `get_inventory_trends`, `analyze_sales_data`
- Prefix with the action verb: `get_`, `analyze_`, `compute_`, `list_`
- Use snake_case (consistent with core and domain tools)

## EC-07: Internal Core Tool Dependency Pattern

Extension tools that need business data MUST read from `ctx.dataContext` directly. They should NEVER invoke core tools via the LLM tool-call mechanism.

**Correct:**
```typescript
async execute(args, ctx) {
  const products = ctx.dataContext.products;  // Direct read from DataContext
  // ...process products...
}
```

**Incorrect:**
```typescript
async execute(args, ctx) {
  // NEVER: invoke get_products via LLM to get product data
  // Core tool data is already in ctx.dataContext
}
```

This pattern ensures:
1. No redundant tool calls (data is already loaded)
2. Consistent data source (same DataContext snapshot)
3. No circular dependencies between tool tiers

## Security

Extension tools are automatically blocked in `public` mode by `SecurityModule`. They are only available in `dashboard` mode (authenticated users). This is enforced by `SecurityModule.isToolAllowed()`.
