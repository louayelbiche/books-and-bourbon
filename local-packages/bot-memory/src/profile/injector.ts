import type { VisitorStore } from '../visitor/visitor-store.js';
import type { VisitorProfile } from '../visitor/types.js';
import type { InjectionBlock } from './types.js';

export class ProfileInjector {
  constructor(private visitorStore: VisitorStore) {}

  async getPromptBlock(visitorId: string): Promise<InjectionBlock | null> {
    const profile = await this.visitorStore.getById(visitorId);
    if (!profile || profile.facts.length === 0) return null;
    return ProfileInjector.formatProfile(profile);
  }

  static formatProfile(profile: VisitorProfile): InjectionBlock {
    // Filter out contact_ facts: stored for CRM use, not LLM injection
    const displayFacts = profile.facts.filter(f => !f.key.startsWith('contact_'));

    if (displayFacts.length === 0) {
      return { promptText: '', tokenEstimate: 0 };
    }

    const lines: string[] = [
      '[CUSTOMER PROFILE]',
      `Visitor: returning (${profile.visitCount} visits, ${profile.totalMessages} messages)`,
      `First seen: ${profile.firstSeenAt.toISOString().split('T')[0]} | Last seen: ${profile.lastSeenAt.toISOString().split('T')[0]}`,
      '',
      'Facts:',
    ];

    for (const fact of displayFacts) {
      lines.push(`- [${fact.category}] ${fact.key}: ${fact.value} (confidence: ${fact.confidence})`);
    }

    if (profile.lastConversationSummary) {
      lines.push('');
      lines.push(`Last conversation: ${profile.lastConversationSummary}`);
    }

    const promptText = lines.join('\n');
    const tokenEstimate = Math.ceil(promptText.length / 4);

    return { promptText, tokenEstimate };
  }
}
