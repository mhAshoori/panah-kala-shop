// Assistant orchestration: performs the provider request eagerly (so route
// handlers can return the provider's real error status before any 200 is
// sent) and exposes the delta stream + parsed tool calls.

import {
  streamChat,
  resolveAiConfig,
  AiError,
  type AiMessage,
  type AiConfig,
} from './provider';
import { getPersonaConfig, renderToolManual, type Persona } from './personas';
import { ADMIN_TOOLS, STOREFRONT_TOOLS } from './tools';

export const MAX_TOOL_ROUNDS = 3;

// Canonical definition lives in sanitize.ts (client-safe; no DB imports).
// Server code here re-exports it for compatibility.
export { TOOL_CALL_RE } from './sanitize';
import { TOOL_CALL_RE } from './sanitize';

export function parseToolCall(
  text: string
): { tool: string; args: Record<string, unknown> } | null {
  const m = text.match(TOOL_CALL_RE);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]) as {
      tool?: unknown;
      args?: unknown;
    };
    if (typeof parsed.tool !== 'string') return null;
    return {
      tool: parsed.tool,
      args:
        typeof parsed.args === 'object' && parsed.args !== null
          ? (parsed.args as Record<string, unknown>)
          : {},
    };
  } catch {
    return null;
  }
}

export function runTool(
  persona: Persona,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const registry = persona === 'admin' ? ADMIN_TOOLS : STOREFRONT_TOOLS;
  const entry = (registry as Record<string, { run: (a: never) => Promise<unknown> }>)[name];
  if (!entry) return Promise.resolve({ error: 'unknown_tool' });
  return entry.run(args as never);
}

export function buildMessages(
  persona: Persona,
  history: AiMessage[],
  grounding?: unknown
): AiMessage[] {
  const config = getPersonaConfig(persona);
  const system = config.systemPrompt + '\n' + renderToolManual(persona);
  const msgs: AiMessage[] = [{ role: 'system', content: system }, ...history];
  if (grounding !== undefined) {
    msgs.push({
      role: 'system',
      content:
        'نتیجه ابزار (فقط برای تو):\n' +
        JSON.stringify(grounding).slice(0, 4000),
    });
  }
  return msgs;
}

/** A model turn: eager provider fetch (throws AiError on failure) plus an
 *  async iterator of text deltas. */
export type ModelTurn = {
  /** Full emitted text available only after iteration ends */
  deltas: AsyncGenerator<string>;
};

/** Open a model turn NOW — the provider HTTP request happens here, so any
 *  auth/quota/network failure throws before the caller commits to a 200. */
export async function openModelTurn(
  persona: Persona,
  history: AiMessage[],
  grounding?: unknown
): Promise<ModelTurn> {
  const config = resolveAiConfig();
  if (!config) throw new AiError('AI_NOT_CONFIGURED', 503);

  const messages = buildMessages(persona, history, grounding);

  // Eagerly validate the provider connection by opening the fetch and
  // checking the response status before yielding anything.
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
      max_tokens: getPersonaConfig(persona).maxTokens,
      temperature: 0.4,
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    // Map provider statuses: 401/403 → bad key (502 for the client), 429 →
    // quota, 5xx → provider down. Pass 429 through as-is.
    const status =
      res.status === 429 ? 429 : res.status >= 500 ? 503 : 502;
    throw new AiError(
      `AI provider error ${res.status}: ${detail.slice(0, 300)}`,
      status
    );
  }

  const providerStream = res.body;

  async function* deltas(): AsyncGenerator<string> {
    const decoder = new TextDecoder();
    let buffer = '';
    const reader = providerStream.getReader();
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

  return { deltas: deltas() };
}

/** Consume a ModelTurn: yields delta events, then a tool or done event. */
export type AssistantEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool'; tool: string; args: Record<string, unknown> }
  | { type: 'done' };

export async function* driveTurn(
  turn: ModelTurn
): AsyncGenerator<AssistantEvent> {
  let emitted = '';
  for await (const delta of turn.deltas) {
    emitted += delta;
    yield { type: 'delta', text: delta };
  }

  const call = parseToolCall(emitted);
  if (call) {
    yield { type: 'tool', tool: call.tool, args: call.args };
  } else {
    yield { type: 'done' };
  }
}

export type { AiConfig };
