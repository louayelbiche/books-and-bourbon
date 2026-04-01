/**
 * Proactive Greeting Module
 *
 * Generates context-aware greetings based on time of day, visitor history,
 * and business category.
 */

export { GreetingGenerator, createQuickGreeting } from './generator.js';
export type {
  GreetingContext,
  GreetingSuggestion,
  ProactiveGreeting,
  TimeOfDay,
  GreetingVariant,
  CategoryGreetingConfig,
  GreetingGeneratorConfig,
} from './types.js';
