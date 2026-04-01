/**
 * Pidgie Chat Widget
 *
 * Embeddable React chat widget for customer-facing interactions.
 */

export { PidgieWidget } from './PidgieWidget.js';
export type { PidgieWidgetProps } from './PidgieWidget.js';

// Voice components
export { VoiceButton } from './components/VoiceButton.js';
export type { VoiceButtonProps } from './components/VoiceButton.js';

// Voice hooks
export { useVoiceRecorder } from './hooks/useVoiceRecorder.js';
export type {
  UseVoiceRecorderOptions,
  UseVoiceRecorderReturn,
  VoiceRecorderState,
} from './hooks/useVoiceRecorder.js';
export { useAudioAnalyser } from './hooks/useAudioAnalyser.js';

// Chat hooks
export { useChat } from './hooks/useChat.js';
export type {
  ChatMessage,
  UseChatOptions,
  UseChatReturn,
} from './hooks/useChat.js';
