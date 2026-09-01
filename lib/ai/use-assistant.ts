'use client';

// Client driver for /api/assistant/chat — consumes the SSE event stream and
// maintains the visible transcript. Shared by the storefront widget and the
// admin panel assistant. Output is sanitized: users see friendly prose only.

import { useCallback, useRef, useState } from 'react';

import {
  sanitizeAssistantChunk,
  sanitizeAssistantText,
  friendlyAssistantError,
  TOOL_CALL_RE,
} from './sanitize';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AssistantStatus = 'idle' | 'streaming' | 'error';

export function useAssistant(persona: 'storefront' | 'admin') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, 600);
      if (!trimmed || status === 'streaming') return;

      const userMsg: ChatMessage = { role: 'user', content: trimmed };
      const history = [...messages, userMsg];
      setMessages([...history, { role: 'assistant', content: '' }]);
      setStatus('streaming');
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      // Streaming sanitizer state (brace/paren awareness across chunks)
      const sanitizeState = { inBraces: false, inParens: false };

      try {
        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona, history }),
          signal: controller.signal,
        });

        // Non-200: the server already returned a friendly Persian message
        // with its true status (visible in the network tab).
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(json.message ?? friendlyAssistantError(res.status));
        }
        if (!res.body) throw new Error(friendlyAssistantError(502));

        // Parse the SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantText = '';
        let streaming = true;

        while (streaming) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data:')) continue;
            let ev;
            try {
              ev = JSON.parse(line.slice(5).trim()) as {
                type: string;
                text?: string;
                status?: number;
                message?: string;
              };
            } catch {
              continue; // partial event
            }
            if (ev.type === 'delta' && ev.text) {
              // Protocol lines (TOOL_CALL …) never reach the transcript
              if (TOOL_CALL_RE.test(ev.text.trim())) continue;
              if (/^\s*TOOL_CALL:/.test(ev.text)) continue;
              if (assistantText.includes('TOOL_CALL:')) continue;
              const clean = sanitizeAssistantChunk(ev.text, sanitizeState);
              if (!clean) continue;
              assistantText += clean;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: 'assistant',
                  content: assistantText,
                };
                return next;
              });
            } else if (ev.type === 'error') {
              throw new Error(ev.message ?? friendlyAssistantError(ev.status ?? 502));
            } else if (ev.type === 'done') {
              streaming = false;
            }
          }
        }

        // Final tidy-up of the complete message
        const final = sanitizeAssistantText(assistantText);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: final || 'متأسفانه پاسخی تولید نشد — لطفاً دوباره بپرسید',
          };
          return next;
        });
        setStatus('idle');
      } catch (e) {
        const message =
          e instanceof Error && e.message !== 'AbortError'
            ? e.message
            : e instanceof Error
              ? null
              : friendlyAssistantError(502);
        if (e instanceof Error && e.message === 'AbortError') {
          setStatus('idle');
        } else {
          const msg = message ?? friendlyAssistantError(502);
          setError(msg);
          setStatus('error');
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant' && !last.content.trim()) {
              next[next.length - 1] = { role: 'assistant', content: msg };
            }
            return next;
          });
        }
      } finally {
        abortRef.current = null;
      }
    },
    [messages, persona, status]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    stop();
    setMessages([]);
    setError(null);
    setStatus('idle');
  }, [stop]);

  return { messages, status, error, send, stop, reset };
}
