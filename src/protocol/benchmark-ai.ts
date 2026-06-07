import { buildInjectionPayload } from './builder';
import type { Subject } from './types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const PROTOCOL_FILENAME = 'stemlm-protocol.txt';

export interface GenerateStemlmOptions {
  question: string;
  subject: Subject;
  apiKey?: string;
  model?: string;
  maxRetries?: number;
}

function readEnv(name: string): string | undefined {
  const processLike = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return processLike?.env?.[name];
}

function readGeminiModel(override?: string): string {
  return override ?? readEnv('GEMINI_MODEL') ?? 'gemini-2.5-flash';
}

function readGeminiApiKey(override?: string): string {
  const key = override ?? readEnv('GEMINI_API_KEY') ?? readEnv('GOOGLE_API_KEY');
  if (!key) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is required to generate stemLM capsules.');
  }
  return key;
}

/**
 * Call Gemini with the same injection payload the live extension uses
 * (composer stub + attached protocol file with subject playbook).
 */
export async function generateStemlmCapsule(options: GenerateStemlmOptions): Promise<string> {
  const apiKey = readGeminiApiKey(options.apiKey);
  const model = readGeminiModel(options.model);
  const payload = buildInjectionPayload(options.question, { subject: options.subject });
  const maxRetries = options.maxRetries ?? 2;
  let lastError: Error | null = null;

  const parts: Array<{ text: string }> = [{ text: payload.composerText }];
  if (payload.fileContent) {
    parts.push({ text: `Attached ${PROTOCOL_FILENAME}:\n${payload.fileContent}` });
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { temperature: 0.2, topP: 0.95 },
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? '')
        .join('\n')
        .trim();

      if (!text) throw new Error('Gemini returned an empty response.');
      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('Failed to generate stemLM capsule');
}
