import type { TaggedFact } from '../visitor/types.js';
import type { MessageRecord } from '../conversation/types.js';
import type { VisitorProfile } from '../visitor/types.js';

export interface SummarizationInput {
  existingProfile: VisitorProfile;
  conversationMessages: MessageRecord[];
}

export interface SummarizationResult {
  facts: TaggedFact[];
  lastConversationSummary: string;
  tokensUsed: { input: number; output: number };
}

export interface InjectionBlock {
  promptText: string;
  tokenEstimate: number;
}
