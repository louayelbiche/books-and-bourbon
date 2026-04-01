import type { BlockDefinition, BlockOutput, BlockDataInput } from '../types';

const VOICE_RULES = `VOICE CALL RULES:
- Keep responses to 2-3 sentences maximum. Be concise. Speak naturally as if on a phone call.
- Do not use bullet points, markdown, or any formatting. Just speak.
- If asked to speak to a human, use the transfer tool to connect them.
- For leads or demo requests, capture the caller's name and interest, then offer to transfer them to the team.
- Never make up information not provided above.
- If you do not know something, say you will have someone follow up.`;

function formatVoice(): BlockOutput {
  return { text: VOICE_RULES, sources: [] }; // no DB source; static behavioral rules
}

function formatChat(): BlockOutput {
  return { text: '', sources: [] }; // not included in chat
}

export const callRulesBlock: BlockDefinition = {
  name: 'call-rules',
  description: 'Static voice call behavioral rules (only non-DB block)',
  order: 200,
  dbSources: [], // no DB source
  condition: (_data: BlockDataInput, channel?: string) => channel !== 'chat',
  formatVoice,
  formatChat,
};
