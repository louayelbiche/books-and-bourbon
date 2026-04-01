/**
 * @runwell/pidgie-shared
 *
 * Shared demo infrastructure for pidgie-powered product frontends.
 * Both pidgie-demo and shopimate-landing consume this package.
 *
 * Sub-path exports:
 * - @runwell/pidgie-shared/api       - Route handler factories
 * - @runwell/pidgie-shared/agent     - BaseDemoAgent abstract class
 * - @runwell/pidgie-shared/chat-widget - Themeable ChatWidget component
 * - @runwell/pidgie-shared/preview   - usePreview hook
 * - @runwell/pidgie-shared/session   - DemoSessionStore
 * - @runwell/pidgie-shared/config    - Type definitions
 */

// Re-export config types from root for convenience
export type { ChatWidgetTheme, ProductConfig, SuggestionMode } from './config/index.js';
export type { BaseDemoAgent, BaseChatMessage, BaseDemoAgentOptions } from './agent/index.js';
export type { BaseSessionData, DemoSessionStoreConfig } from './session/index.js';
export type { PreviewTier, UsePreviewOptions, UsePreviewReturn } from './preview/index.js';
