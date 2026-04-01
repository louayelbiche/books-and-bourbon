/**
 * Claude CLI subprocess wrapper.
 * Spawns `claude --print` with prompt piped to stdin.
 * Same pattern as Genie's review_agent/tools/claude_review.py.
 */

import { spawn } from 'child_process';
import type { FlatTranslations } from './types.js';

const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Invoke Claude CLI with a prompt and return the raw stdout.
 */
export async function invokeClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['--print'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn claude CLI: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `claude CLI exited with code ${code}.\nstderr: ${stderr}\nstdout: ${stdout}`
          )
        );
      } else {
        resolve(stdout.trim());
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * Parse Claude's response as JSON.
 * Strips markdown code fences if present.
 */
export function parseResponse(raw: string): FlatTranslations {
  let cleaned = raw.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  return JSON.parse(cleaned) as FlatTranslations;
}

/**
 * Validate that translated output preserves all {{variable}} tokens.
 * Returns list of validation errors.
 */
export function validateTranslation(
  input: FlatTranslations,
  output: FlatTranslations,
  lang: string
): string[] {
  const errors: string[] = [];

  // Check all input keys are present in output
  for (const key of Object.keys(input)) {
    if (!(key in output)) {
      errors.push(`Missing key: ${key}`);
    }
  }

  // Check {{variable}} tokens preserved
  for (const [key, inputValue] of Object.entries(input)) {
    if (!(key in output)) continue;

    const inputVars = new Set(
      [...inputValue.matchAll(VARIABLE_PATTERN)].map((m) => m[1])
    );
    const outputVars = new Set(
      [...output[key].matchAll(VARIABLE_PATTERN)].map((m) => m[1])
    );

    for (const v of inputVars) {
      if (!outputVars.has(v)) {
        errors.push(
          `Key "${key}": missing {{${v}}} in translation`
        );
      }
    }
  }

  // Check for unexpected extra keys (except Arabic _zero which is expected)
  for (const key of Object.keys(output)) {
    if (!(key in input)) {
      // Allow _zero keys for Arabic
      if (lang === 'ar' && key.endsWith('_zero')) {
        continue;
      }
      errors.push(`Unexpected extra key: ${key}`);
    }
  }

  return errors;
}

/**
 * Invoke Claude and parse/validate the response.
 * Retries once on failure.
 */
export async function translateBatch(
  prompt: string,
  inputKeys: FlatTranslations,
  lang: string
): Promise<{ translations: FlatTranslations; errors: string[] }> {
  const maxRetries = 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await invokeClaude(prompt);
      const parsed = parseResponse(raw);
      const errors = validateTranslation(inputKeys, parsed, lang);

      if (errors.length === 0 || attempt === maxRetries) {
        return { translations: parsed, errors };
      }

      // Retry with hint
      console.warn(
        `  Validation errors on attempt ${attempt + 1}, retrying...`
      );
      console.warn(`  Errors: ${errors.join('; ')}`);
    } catch (err) {
      if (attempt === maxRetries) {
        return {
          translations: {},
          errors: [
            `Failed after ${maxRetries + 1} attempts: ${(err as Error).message}`,
          ],
        };
      }
      console.warn(
        `  Parse error on attempt ${attempt + 1}, retrying: ${(err as Error).message}`
      );
    }
  }

  // Unreachable, but TypeScript needs it
  return { translations: {}, errors: ['Exhausted retries'] };
}
