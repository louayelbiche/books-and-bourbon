/**
 * Creates the default block registry with all 12 blocks, then seals it.
 * After this, no blocks can be added at runtime.
 */

import { BlockRegistry } from './block-registry';
import { identityBlock } from './blocks/identity';
import { customInstructionsBlock } from './blocks/custom-instructions';
import { hoursBlock } from './blocks/hours';
import { servicesBlock } from './blocks/services';
import { productsBlock } from './blocks/products';
import { menuBlock } from './blocks/menu';
import { faqsBlock } from './blocks/faqs';
import { contactBlock } from './blocks/contact';
import { bookingBlock } from './blocks/booking';
import { leadQualificationBlock } from './blocks/lead-qualification';
import { callerBlock } from './blocks/caller';
import { callRulesBlock } from './blocks/call-rules';

export function createDefaultRegistry(): BlockRegistry {
  const registry = new BlockRegistry();

  registry.register(identityBlock);
  registry.register(customInstructionsBlock);
  registry.register(hoursBlock);
  registry.register(servicesBlock);
  registry.register(productsBlock);
  registry.register(menuBlock);
  registry.register(faqsBlock);
  registry.register(contactBlock);
  registry.register(bookingBlock);
  registry.register(leadQualificationBlock);
  registry.register(callerBlock);
  registry.register(callRulesBlock);

  registry.seal();
  return registry;
}
