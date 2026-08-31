// Provider-agnostic AI client for the shop assistants.
//
// Supported providers (chosen by env):
//  - 'openai-compatible' — any OpenAI-compatible endpoint (Groq, OpenRouter
//    free models, self-hosted LiteLLM/9router-style proxy on a VPS, Ollama…)
//  - 'gemini' — Google AI Studio free tier (native REST, best free Persian)
//
// Keys live server-side only. No AI traffic ever originates from the browser;
// the browser only talks to /api/assistant/chat on this origin.

export type AiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AiConfig = {
  provider: 'openai-compatible' | 'gemini';
  baseUrl: string;
  apiKey: string;
  model: string;
};

export const AI_NOT_CONFIGURED =
  'AI assistant is not configured (missing AI_* environment variables).';

export function resolveAiConfig(): AiConfig | null {
  const apiKey = process.env.AI_API_KEY ?? '';
  if (!apiKey) return null;

  // Explicit provider beats inference
  const explicit = process.env.AI_PROVIDER as AiConfig['provider'] | undefined;

  // Known defaults: Groq, OpenRouter, Gemini, self-hosted proxy
  const baseUrl =
    process.env.AI_BASE_URL ??
    (explicit === 'gemini'
      ? 'https://generativelanguage.googleapis.com/v1beta/openai'
      : 'https://api.groq.com/openai/v1');
  const model =
    process.env.AI_MODEL ??
    (baseUrl.includes('groq')
      ? 'llama-3.3-70b-versatile'
      : baseUrl.includes('openrouter')
        ? 'google/gemini-2.0-flash-exp:free'
        : baseUrl.includes('generativelanguage')
          ? 'gemini-2.0-flash'
          : 'default');

  const provider: AiConfig['provider'] =
    explicit ?? (baseUrl.includes('generativelanguage') ? 'gemini' : 'openai-compatible');

  return { provider, baseUrl: baseUrl.replace(/\/$/, ''), apiKey, model };
}

export class AiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

/**
 * Stream a chat completion as a plain text/event-stream of text deltas.
 * Yields string chunks. Throws AiError on provider failure.
 */
export async function* streamChat(
  config: AiConfig,
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): AsyncGenerator<string> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
      max_tokens: opts.maxTokens ?? 700,
      temperature: opts.temperature ?? 0.4,
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new AiError(
      `AI provider error ${res.status}: ${detail.slice(0, 200)}`,
      502
    );
  }

  // OpenAI-compatible SSE: lines of "data: {json}"
  const decoder = new TextDecoder();
  let buffer = '';
  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // Partial/keep-alive lines are ignored
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
