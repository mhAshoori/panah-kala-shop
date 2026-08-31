import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { rateLimit } from '@/lib/rate-limit';
import { AI_NOT_CONFIGURED, resolveAiConfig, type AiMessage } from '@/lib/ai/provider';
import { MAX_TOOL_ROUNDS, assist, runTool } from '@/lib/ai/run';
import type { Persona } from '@/lib/ai/personas';

// Persian/English phone numbers and emails never leave the server
function scrubPii(text: string): string {
  return text
    .replace(/(\+?98|0)?9\d{9}/g, '[شماره تماس]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[ایمیل]');
}

const MAX_HISTORY = 10; // messages after clamping
const MAX_MESSAGE_LEN = 600;

const GUEST_LIMIT = 8;
const GUEST_WINDOW = 10 * 60 * 1000;
const USER_LIMIT = 20;
const USER_WINDOW = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await auth();
  let body: {
    persona?: string;
    history?: { role?: string; content?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const persona: Persona = body.persona === 'admin' ? 'admin' : 'storefront';

  // Admin assistant requires the admin role
  if (persona === 'admin' && session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (!resolveAiConfig()) {
    return NextResponse.json(
      { error: 'not_configured', message: AI_NOT_CONFIGURED },
      { status: 503 }
    );
  }

  // Rate limit per user (or per session cookie for guests)
  const cookieSession = req.headers
    .get('cookie')
    ?.match(/sessionCartId=([^;]+)/)?.[1];
  const identity = session?.user?.id
    ? `user:${session.user.id}`
    : `guest:${cookieSession ?? req.headers.get('x-forwarded-for') ?? 'anon'}`;
  const rl = rateLimit(
    `ai:${persona}:${identity}`,
    session?.user?.id ? USER_LIMIT : GUEST_LIMIT,
    session?.user?.id ? USER_WINDOW : GUEST_WINDOW
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfterSeconds },
      { status: 429 }
    );
  }

  // Sanitize + clamp the client-supplied history
  let history: AiMessage[] = (Array.isArray(body.history) ? body.history : [])
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string'
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role,
      content: scrubPii(m.content.slice(0, MAX_MESSAGE_LEN)),
    }));

  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // SSE stream of assistant events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          let pendingTool: { tool: string; args: Record<string, unknown> } | null =
            null;

          for await (const ev of assist(persona, history)) {
            if (ev.type === 'delta') {
              // Hide raw TOOL_CALL lines from the user's chat
              send({ type: 'delta', text: ev.text });
            } else if (ev.type === 'tool') {
              pendingTool = { tool: ev.tool, args: ev.args };
              send({ type: 'tool', tool: ev.tool });
            } else {
              send({ type: 'done' });
            }
          }

          if (!pendingTool) break;

          // Run the requested tool server-side and feed the result back
          let result: unknown;
          try {
            result = await runTool(persona, pendingTool.tool, pendingTool.args);
          } catch {
            result = { error: 'tool_failed' };
          }
          send({ type: 'tool_result', tool: pendingTool.tool });

          history = [
            ...history,
            {
              role: 'assistant',
              content: `TOOL_CALL: ${JSON.stringify({
                tool: pendingTool.tool,
                args: pendingTool.args,
              })}`,
            },
            {
              role: 'user',
              content: `TOOL_RESULT: ${JSON.stringify(result).slice(0, 4000)}`,
            },
          ];
        }
      } catch {
        send({
          type: 'error',
          message: 'خطا در دستیار هوشمند — لطفاً دوباره تلاش کنید',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
