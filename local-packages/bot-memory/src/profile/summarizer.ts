import type { VisitorStore } from '../visitor/visitor-store.js';
import type { ConversationStore } from '../conversation/store.js';
import type { TaggedFact } from '../visitor/types.js';
import type { SummarizationResult } from './types.js';
import { buildSummarizationInput } from './prompt.js';

export interface LLMCallResult {
  text: string;
  tokensUsed: { input: number; output: number };
}

export interface ProfileSummarizerOptions {
  visitorStore: VisitorStore;
  conversationStore: ConversationStore;
  llmCall: (prompt: string) => Promise<LLMCallResult>;
  onError?: (error: Error, visitorId: string) => void;
  onComplete?: (result: SummarizationResult, visitorId: string) => void;
}

export class ProfileSummarizer {
  private visitorStore: VisitorStore;
  private conversationStore: ConversationStore;
  private llmCall: (prompt: string) => Promise<LLMCallResult>;
  private onError?: (error: Error, visitorId: string) => void;
  private onComplete?: (result: SummarizationResult, visitorId: string) => void;

  constructor(options: ProfileSummarizerOptions) {
    this.visitorStore = options.visitorStore;
    this.conversationStore = options.conversationStore;
    this.llmCall = options.llmCall;
    this.onError = options.onError;
    this.onComplete = options.onComplete;
  }

  async summarize(visitorId: string, conversationId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const profile = await this.visitorStore.getById(visitorId);
      if (!profile) return;

      const messages = await this.conversationStore.getMessages(conversationId);
      if (messages.length === 0) return;

      const existingJson = JSON.stringify({
        facts: profile.facts,
        last_conversation_summary: profile.lastConversationSummary,
      });

      const transcript = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const prompt = buildSummarizationInput(existingJson, transcript);
      const llmResult = await this.llmCall(prompt);

      const parsed = this.parseResponse(llmResult.text);
      if (!parsed) {
        throw new Error(`Failed to parse LLM response: ${llmResult.text.slice(0, 200)}`);
      }

      await this.visitorStore.updateProfile(
        visitorId,
        parsed.facts,
        parsed.lastConversationSummary
      );

      await this.visitorStore.incrementMessages(visitorId, messages.length);

      const result: SummarizationResult = {
        facts: parsed.facts,
        lastConversationSummary: parsed.lastConversationSummary,
        tokensUsed: llmResult.tokensUsed,
      };

      const durationMs = Date.now() - startTime;
      console.log(JSON.stringify({
        event: 'profile_summarization',
        visitorId,
        conversationId,
        inputTokens: llmResult.tokensUsed.input,
        outputTokens: llmResult.tokensUsed.output,
        durationMs,
        factsCount: parsed.facts.length,
        timestamp: new Date().toISOString(),
      }));

      this.onComplete?.(result, visitorId);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Profile summarization failed for visitor ${visitorId}:`, err.message);
      this.onError?.(err, visitorId);
    }
  }

  private parseResponse(text: string): { facts: TaggedFact[]; lastConversationSummary: string } | null {
    try {
      const cleaned = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed.facts)) return null;

      const facts: TaggedFact[] = parsed.facts.map((f: Record<string, unknown>) => ({
        category: String(f.category ?? 'context'),
        key: String(f.key ?? ''),
        value: String(f.value ?? ''),
        confidence: Number(f.confidence ?? 0.5),
      }));

      return {
        facts,
        lastConversationSummary: String(parsed.last_conversation_summary ?? ''),
      };
    } catch {
      return null;
    }
  }
}
