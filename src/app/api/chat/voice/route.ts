/**
 * Voice transcription endpoint for the concierge bot.
 * Uses createVoiceHandler factory from concierge-shared.
 */

import { createVoiceHandler } from '@runwell/concierge-shared/api';
import { sessionStore } from '@/lib/chat/session-store';

export const POST = createVoiceHandler({
  sessionStore,
});
