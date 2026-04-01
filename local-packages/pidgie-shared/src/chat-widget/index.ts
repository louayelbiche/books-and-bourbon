/**
 * Themeable floating chat widget for demo apps.
 *
 * Uses inline styles from a ChatWidgetTheme object — no CSS variable
 * or Tailwind coupling. Each product passes its own theme.
 *
 * Voice recording uses pidgie-core's useVoiceRecorder hook.
 * Markdown rendering uses react-markdown.
 */

'use client';

export { ChatWidget } from './ChatWidget.js';
export type { ChatWidgetProps, ChatWidgetLabels } from './ChatWidget.js';
