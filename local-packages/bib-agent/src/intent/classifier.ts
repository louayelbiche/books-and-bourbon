/**
 * Intent Classifier
 *
 * Deterministic intent classification using pattern matching.
 * Runs BEFORE the LLM. Outputs a ClassifiedIntent that the
 * ActionState machine uses to manage pending actions.
 *
 * Priority order (highest first):
 * 1. Confirmation/Cancellation (only when pending action exists)
 * 2. Help (complaints, human requests, account data)
 * 3. Order (buy/reserve with specific products)
 * 4. Booking (schedule appointment with date/time)
 * 5. Interest (general buying intent, quote requests)
 * 6. None (regular conversation)
 */

import type { ClassifiedIntent, ExtractedData, IntentType } from './types.js';
import {
  extractEmail,
  extractPhone,
  extractName,
  extractProducts,
  isConfirmation,
  isCancellation,
  detectHelpSignals,
  detectInterestSignals,
  detectOrderSignals,
  detectBookingSignals,
  hasOrderNumber,
  hasDate,
} from './patterns.js';

export class IntentClassifier {
  /**
   * Classify user message intent.
   *
   * @param message - The user's message text
   * @param hasPendingAction - Whether a pending action exists in the session
   * @param history - Conversation history (used to detect confirmation context)
   * @returns ClassifiedIntent with type, confidence, and extracted data
   */
  classify(message: string, hasPendingAction: boolean = false, history?: { role: string; content: string }[]): ClassifiedIntent {
    // If no explicit pending action, check if the LAST assistant message
    // offered an action (asked for confirmation). This handles stateless servers.
    if (!hasPendingAction && history && history.length > 0) {
      const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
      if (lastAssistant) {
        const offerPatterns = [
          /souhaitez-vous/i,
          /voulez-vous que je/i,
          /would you like me to/i,
          /shall I/i,
          /puis-je proc[ée]der/i,
          /confirmez/i,
          /d['']accord\s*\?/i,
          /soumett/i,
        ];
        if (offerPatterns.some(p => p.test(lastAssistant.content))) {
          hasPendingAction = true;
        }
      }
    }
    const text = message.trim();
    const extracted = this.extractData(text);
    const signals: string[] = [];

    // 1. Confirmation / Cancellation (only if pending action exists)
    if (hasPendingAction) {
      if (isConfirmation(text)) {
        // Reconstruct context from history if available
        if (history && history.length > 0) {
          const firstUserMsg = history.find(m => m.role === 'user');
          if (firstUserMsg && !extracted.question) {
            extracted.question = firstUserMsg.content;
          }
        }
        return {
          type: 'confirmation',
          confidence: 0.95,
          extractedData: extracted,
          signals: ['confirmation_pattern', 'history_context'],
        };
      }
      if (isCancellation(text)) {
        return {
          type: 'cancellation',
          confidence: 0.95,
          extractedData: extracted,
          signals: ['cancellation_pattern'],
        };
      }
    }

    // 2. Detect intent signals
    const helpSignals = detectHelpSignals(text);
    const interestSignals = detectInterestSignals(text);
    const orderSignals = detectOrderSignals(text);
    const bookingSignals = detectBookingSignals(text);

    // 3. Score each intent
    const scores: { type: IntentType; score: number; signals: string[] }[] = [];

    // HELP scoring
    if (helpSignals.length > 0) {
      let score = helpSignals.length * 0.3;
      if (hasOrderNumber(text)) score += 0.3; // Mentions order/contract number
      if (helpSignals.length >= 2) score += 0.2; // Multiple help signals
      scores.push({ type: 'help', score: Math.min(score, 1), signals: helpSignals });
    }

    // ORDER scoring
    if (orderSignals.length > 0) {
      let score = orderSignals.length * 0.3;
      if (extracted.products && extracted.products.length > 0) score += 0.3;
      if (extracted.name) score += 0.1;
      scores.push({ type: 'order', score: Math.min(score, 1), signals: orderSignals });
    }

    // BOOKING scoring
    if (bookingSignals.length > 0) {
      let score = bookingSignals.length * 0.3;
      if (hasDate(text)) score += 0.3;
      scores.push({ type: 'booking', score: Math.min(score, 1), signals: bookingSignals });
    }

    // INTEREST scoring
    if (interestSignals.length > 0) {
      let score = interestSignals.length * 0.25;
      if (extracted.email || extracted.phone) score += 0.3; // Contact info = strong signal
      if (extracted.products && extracted.products.length > 0) score += 0.15;
      scores.push({ type: 'interest', score: Math.min(score, 1), signals: interestSignals });
    }

    // Contact info with no other signals + product context = interest
    if (scores.length === 0 && (extracted.email || extracted.phone) && extracted.name) {
      scores.push({
        type: 'interest',
        score: 0.5,
        signals: ['contact_info_provided'],
      });
    }

    // 4. Pick highest scoring intent (min threshold: 0.3)
    if (scores.length > 0) {
      scores.sort((a, b) => b.score - a.score);
      const best = scores[0];
      if (best.score >= 0.3) {
        return {
          type: best.type as IntentType,
          confidence: best.score,
          extractedData: extracted,
          signals: best.signals,
        };
      }
    }

    // 5. Default: no action intent
    return {
      type: 'none',
      confidence: 1,
      extractedData: extracted,
      signals: [],
    };
  }

  /**
   * Extract structured data from message text.
   */
  private extractData(text: string): ExtractedData {
    const data: ExtractedData = {};

    const email = extractEmail(text);
    if (email) data.email = email;

    const phone = extractPhone(text);
    if (phone) data.phone = phone;

    const name = extractName(text);
    if (name) data.name = name;

    const products = extractProducts(text);
    if (products.length > 0) data.products = products;

    return data;
  }
}
