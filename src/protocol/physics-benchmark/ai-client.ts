import type { Subject } from '../types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const PROTOCOL_FILENAME = 'stemlm-protocol.txt';

interface GeminiResponsePart {
  text?: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiResponsePart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

interface InjectionPayloadLike {
  composerText: string;
  fileContent: string;
}

function readEnv(name: string): string | undefined {
  const processLike = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return processLike?.env?.[name];
}

function readGeminiModel(): string {
  return readEnv('GEMINI_MODEL') ?? 'gemini-2.5-flash';
}

function readGeminiApiKey(): string {
  const key = readEnv('GEMINI_API_KEY') ?? readEnv('GOOGLE_API_KEY');
  if (!key) {
    throw new Error('Missing GEMINI_API_KEY or GOOGLE_API_KEY in environment.');
  }
  return key;
}

function extractGeminiText(response: GeminiResponse): string {
  const firstCandidate = response.candidates?.[0];
  const parts = firstCandidate?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? '')
    .join('\n')
    .trim();
}

async function buildPayload(question: string, subject: Subject): Promise<InjectionPayloadLike> {
  try {
    const builderModule = await import('../builder');
    return builderModule.buildInjectionPayload(question, { subject });
  } catch {
    return {
      composerText: [
        question.trim(),
        '',
        'Reply as one fenced stemlm capsule and end with @end.',
      ].join('\n'),
      fileContent: '',
    };
  }
}

export async function generatePhysicsCapsule(
  question: string,
  subject: Subject = 'Physics',
): Promise<string> {
  const apiKey = readGeminiApiKey();
  const payload = await buildPayload(question, subject);
  const model = readGeminiModel();
  const parts: GeminiResponsePart[] = [{ text: payload.composerText }];
  if (payload.fileContent) {
    parts.push({ text: `Attached ${PROTOCOL_FILENAME}:\n${payload.fileContent}` });
  }

  const response = await fetch(
    `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini request failed (${response.status} ${response.statusText}): ${body}`);
  }

  const json = (await response.json()) as GeminiResponse;
  const text = extractGeminiText(json);

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text;
}
