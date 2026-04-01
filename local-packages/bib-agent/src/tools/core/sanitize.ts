/**
 * Sanitize Content Core Tool
 *
 * Canonical implementation of content sanitization for prompt injection
 * prevention. This was previously duplicated across:
 * - packages/social-agent/src/tools/generate-posts.ts (sanitizeContent function)
 * - packages/engagement-agent/src/tools/generate-newsletter.ts (similar)
 *
 * Now unified as a single BibTool that can be used by any agent.
 *
 * The tool:
 * 1. Strips prompt injection patterns (IGNORE PREVIOUS, [system], etc.)
 * 2. Truncates overly long content to prevent context window abuse
 * 3. Returns the sanitized content as a string
 */

import type { BibTool, BibToolContext } from '../types.js';

// =============================================================================
// Injection Patterns
// =============================================================================

/**
 * Regex patterns that detect common prompt injection attempts.
 * Each matched pattern is replaced with '[REDACTED]'.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
  /you\s+are\s+(now|no\s+longer)\b/gi,
  /\[system\]/gi,
  /\[INST\]/gi,
  /<\/?system>/gi,
  /override\s+(instructions?|rules?|settings?)/gi,
  /forget\s+(all\s+)?(previous|prior)\s+(instructions?|rules?)/gi,
  /new\s+instructions?:\s*/gi,
  /disregard\s+(all\s+)?(previous|prior|above)/gi,
];

/** Maximum content length before truncation */
const MAX_CONTENT_LENGTH = 15000;

// =============================================================================
// Standalone sanitize function (for non-tool usage)
// =============================================================================

/**
 * Sanitize content by removing prompt injection patterns and truncating.
 *
 * This is the canonical implementation — all agents should use this
 * instead of maintaining their own copy.
 *
 * @param content - Raw content to sanitize
 * @param maxLength - Maximum content length (default: 15000)
 * @returns Sanitized content string
 */
export function sanitizeContent(content: string, maxLength: number = MAX_CONTENT_LENGTH): string {
  let sanitized = content;

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '\n[Content truncated]';
  }

  return sanitized;
}

// =============================================================================
// sanitize_content BibTool
// =============================================================================

export const sanitizeContentTool: BibTool = {
  name: 'sanitize_content',
  description:
    'Sanitize user-provided or external content by removing prompt injection patterns and truncating overly long text. Use this before passing external content to LLM prompts.',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The content to sanitize',
      },
      max_length: {
        type: 'number',
        description: `Maximum content length before truncation (default: ${MAX_CONTENT_LENGTH})`,
      },
    },
    required: ['content'],
  },
  tier: 'core',
  execute: async (args: Record<string, unknown>, _ctx: BibToolContext) => {
    const content = args.content as string;
    if (!content) {
      return { error: 'Content is required', sanitized: '' };
    }

    const maxLength = (args.max_length as number) || MAX_CONTENT_LENGTH;
    const sanitized = sanitizeContent(content, maxLength);

    return {
      sanitized,
      originalLength: content.length,
      sanitizedLength: sanitized.length,
      wasTruncated: content.length > maxLength,
      patternsFound: content !== sanitized && content.length <= maxLength,
    };
  },
};
