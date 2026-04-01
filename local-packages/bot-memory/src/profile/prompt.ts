export const SUMMARIZATION_PROMPT = `You are a customer profile manager. You will receive:
1. An existing customer profile (JSON with tagged facts)
2. A conversation transcript

Produce an UPDATED profile JSON that merges new information from the conversation.

Rules:
- If the conversation reveals a preference that contradicts an existing fact, UPDATE the fact. Newer information wins. Adjust confidence based on how explicitly stated it was.
- If the conversation reveals NEW information not in the profile, ADD it as a new tagged fact.
- Categories: preference, interest, behavior, intent, context.
- Do NOT remove facts unless directly contradicted.
- Keep last_conversation_summary as a 1-2 sentence summary of THIS conversation only.
- Confidence: 1.0 for explicitly stated facts, 0.8-0.9 for strong implications, 0.5-0.7 for weak signals.
- Contact info: If the person shares their name, store as category='context', key='contact_name'. Email: key='contact_email'. Phone: key='contact_phone'. Use confidence=1.0 for explicitly stated contact info.
- Output ONLY valid JSON. No explanation, no markdown fences.

Schema:
{
  "facts": [{ "category": "preference|interest|behavior|intent|context", "key": "string", "value": "string", "confidence": 0.0-1.0 }],
  "last_conversation_summary": "string"
}`;

export function buildSummarizationInput(
  existingProfileJson: string,
  transcript: string
): string {
  return `${SUMMARIZATION_PROMPT}

EXISTING PROFILE:
${existingProfileJson}

CONVERSATION TRANSCRIPT:
${transcript}

UPDATED PROFILE JSON:`;
}
