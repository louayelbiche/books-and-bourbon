/** Token usage returned by a generate() call */
export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMClientOptions {
  /** Default: 0.7 */
  temperature?: number;
  /** Default: 4096 */
  maxOutputTokens?: number;
  /** Default: 30_000 */
  timeoutMs?: number;
  /** Default: 'json' */
  responseFormat?: 'json' | 'text';
  /** Callback invoked with token usage after each generate() call */
  onUsage?: (usage: LLMUsage) => void;
}

export interface LLMClientParams {
  prompt: string;
  /** Optional system instruction. When provided, sent as system_instruction in Gemini API. */
  systemPrompt?: string;
  options?: LLMClientOptions;
}

export interface LLMClient {
  generate(params: LLMClientParams): Promise<string>;
}
