/**
 * VoiceEnforcer — Pipeline Step (Order 20, Mandatory)
 *
 * Detects third-person AI references that break the "you ARE the business"
 * voice rule. Raises a warning flag but does NOT modify the text.
 *
 * Pattern: "the AI/bot/system/assistant/chatbot suggests/recommends/thinks/etc."
 *
 * @see spec TASK-029
 */

import type { PipelineStep, PipelineContext, PipelineResult, PipelineFlag } from '../types.js';

// =============================================================================
// Voice Pattern
// =============================================================================

const VOICE_PATTERN =
  /the (?:AI|bot|system|assistant|chatbot) (?:suggests?|recommends?|thinks?|believes?|says?|can help)/gi;

// =============================================================================
// VoiceEnforcer Implementation
// =============================================================================

export class VoiceEnforcer implements PipelineStep {
  name = 'voice-enforcer';
  order = 20;

  process(text: string, ctx: PipelineContext): PipelineResult {
    const flags: PipelineFlag[] = [];

    let match: RegExpExecArray | null;
    const regex = new RegExp(VOICE_PATTERN.source, VOICE_PATTERN.flags);

    while ((match = regex.exec(text)) !== null) {
      flags.push({
        step: this.name,
        severity: 'warning',
        message: `Third-person AI reference detected: "${match[0]}"`,
        original: match[0],
      });
    }

    // Text is returned UNMODIFIED — warning only
    return { text, flags };
  }
}
