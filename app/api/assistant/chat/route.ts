import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { rateLimit } from '@/lib/rate-limit';
import { AI_NOT_CONFIGURED, resolveAiConfig, AiError, type AiMessage } from '@/lib/ai/provider';
import { MAX_TOOL_ROUNDS, openModelTurn, driveTurn, runTool } from '@/lib/ai/run';
import { friendlyAssistantError, sanitizeAssistantChunk } from '@/lib/ai/sanitize';
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
    console.warn(
      `[ai] forbidden admin-assistant attempt persona=admin ip=${req.headers.get('x-forwarded-for') ?? 'local'}`
    );
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (!resolveAiConfig()) {
    console.error('[ai] not configured — set AI_API_KEY / AI_BASE_URL / AI_MODEL');
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
    console.warn(`[ai] rate limited ${identity} persona=${persona}`);
    return NextResponse.json(
      { error: 'rate_limited', message: friendlyAssistantError(429) },
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

  // Eager first turn: the provider request happens NOW. A bad key, quota
  // exhaustion, or provider outage returns its real status (502/429/503)
  // to the browser's network tab instead of a useless 200.
  let firstTurn;
  try {
    firstTurn = await openModelTurn(persona, history);
  } catch (error) {
    const status =
      error instanceof AiError ? error.status : 502;
    console.error(
      `[ai] provider error status=${status} persona=${persona}:`,
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: 'provider_error', message: friendlyAssistantError(status) },
      { status }
    );
  }

  // SSE stream of assistant events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      try {
        let turn = firstTurn;
        let roundsWithTools = 0;
        for (let round = 0; ; round++) {
          let pendingTool: { tool: string; args: Record<string, unknown> } | null =
            null;
          let emitted = '';
          const sanitizeState = { inBraces: false, inParens: false };

          for await (const ev of driveTurn(turn)) {
            if (ev.type === 'delta') {
              emitted += ev.text;
              // Buffer while the output looks like a tool request — only
              // clean prose is forwarded to the user's transcript.
              if (!emitted.startsWith('TOOL_CALL:')) {
                const clean = sanitizeAssistantChunk(ev.text, sanitizeState);
                if (clean) send({ type: 'delta', text: clean });
              }
            } else if (ev.type === 'tool') {
              pendingTool = { tool: ev.tool, args: ev.args };
              send({ type: 'tool', tool: ev.tool });
            } else {
              send({ type: 'done' });
            }
          }

          // Model asked for another tool after the cap — force a final
          // answer with the gathered history (tool results already in it)
          // so the user is never left with an empty reply.
          if (pendingTool && round >= MAX_TOOL_ROUNDS) {
            const finalTurn = await openModelTurn(persona, [
              ...history,
              {
                role: 'user',
                content:
                  'دیگر ابزار در دسترس نیست. با اطلاعاتی که تاکنون به دست آورده‌ای همین حالا پاسخ نهایی را به کاربر بده.',
              },
            ]);
            const sanitizeState2 = { inBraces: false, inParens: false };
            for await (const ev of driveTurn(finalTurn)) {
              if (ev.type === 'delta') {
                const clean = sanitizeAssistantChunk(ev.text, sanitizeState2);
                if (clean) send({ type: 'delta', text: clean });
              }
            }
            send({ type: 'done' });
            break;
          }

          if (!pendingTool) break;

          // Run the requested tool server-side and feed the result back
          let result: unknown;
          try {
            result = await runTool(persona, pendingTool.tool, pendingTool.args);
          } catch (error) {
            console.error(
              `[ai] tool ${pendingTool.tool} failed:`,
              error instanceof Error ? error.message : error
            );
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

          // Subsequent turns open inside the stream — a failure here can't
          // change headers anymore, so it degrades to an in-stream error.
          try {
            turn = await openModelTurn(persona, history);
          } catch (error) {
            const status = error instanceof AiError ? error.status : 502;
            console.error(
              `[ai] provider error (round ${round + 1}) status=${status}:`,
              error instanceof Error ? error.message : error
            );
            send({ type: 'error', status, message: friendlyAssistantError(status) });
            break;
          }
        }
      } catch (error) {
        console.error(
          '[ai] unexpected stream error:',
          error instanceof Error ? error.message : error
        );
        send({
          type: 'error',
          status: 502,
          message: friendlyAssistantError(502),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
