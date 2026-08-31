// Assistant orchestration: runs the model → parses a single TOOL_CALL →
// executes the matching grounded tool → feeds the result back. The route
// handler drives this generator across up to MAX_TOOL_ROUNDS rounds.

import {
  streamChat,
  resolveAiConfig,
  AiError,
  type AiMessage,
} from './provider';
import { getPersonaConfig, renderToolManual, type Persona } from './personas';
import { ADMIN_TOOLS, STOREFRONT_TOOLS } from './tools';

export const MAX_TOOL_ROUNDS = 3;

export const TOOL_CALL_RE = /^\s*TOOL_CALL:\s*(\{[\s\S]*\})\s*$/;

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

/** Yield text deltas; when the model asks for a tool, yields the parsed
 *  tool + args so the route can run it and continue the loop. */
export type AssistantEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool'; tool: string; args: Record<string, unknown> }
  | { type: 'done' };

export async function* assist(
  persona: Persona,
  history: AiMessage[],
  grounding?: unknown
): AsyncGenerator<AssistantEvent> {
  const config = resolveAiConfig();
  if (!config) throw new AiError('AI_NOT_CONFIGURED', 503);

  const messages = buildMessages(persona, history, grounding);
  let emitted = '';
  for await (const delta of streamChat(config, messages, {
    maxTokens: getPersonaConfig(persona).maxTokens,
  })) {
    emitted += delta;
    yield { type: 'delta', text: delta };
  }

  const call = parseToolCall(emitted);
  if (call) {
    // Suppress the raw TOOL_CALL text from the user's view
    yield { type: 'tool', tool: call.tool, args: call.args };
  } else {
    yield { type: 'done' };
  }
}
