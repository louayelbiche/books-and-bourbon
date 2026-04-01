/**
 * Intent Classification and Action Dispatch Framework
 *
 * Separates conversation (LLM) from action execution (deterministic).
 * The LLM handles natural language; this framework handles action detection,
 * confirmation, and guaranteed execution.
 */

export { IntentClassifier } from './classifier.js';
export { ActionStateManager } from './action-state.js';
export { ActionDispatcher } from './dispatcher.js';

export type {
  IntentType,
  ClassifiedIntent,
  ExtractedData,
  PendingAction,
  ActionState,
  ActionResult,
  ContextInjection,
  ActionToolName,
} from './types.js';
