'use client';

// Client driver for /api/assistant/chat — consumes the SSE event stream and
// maintains the visible transcript. Shared by the storefront widget and the
// admin panel assistant.

import { useCallback, useRef, useState } from 'react';

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

      try {
        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona, history }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const json = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(
            json.message ??
              (res.status === 429
                ? 'تعداد پیام‌ها زیاد است — کمی بعد تلاش کنید'
                : 'خطا در ارتباط با دستیار')
          );
        }

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
            try {
              const ev = JSON.parse(line.slice(5).trim()) as {
                type: string;
                text?: string;
                message?: string;
              };
              if (ev.type === 'delta' && ev.text) {
                // Suppress raw TOOL_CALL protocol lines from the transcript
                const visible = ev.text.replace(/^\s*TOOL_CALL:[\s\S]*/, '');
                assistantText += visible;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = {
                    role: 'assistant',
                    content: assistantText,
                  };
                  return next;
                });
              } else if (ev.type === 'tool') {
                // Light indicator while grounding
                assistantText += '';
              } else if (ev.type === 'error') {
                throw new Error(ev.message ?? 'خطا در دستیار');
              } else if (ev.type === 'done') {
                streaming = false;
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }

        // If nothing visible survived (pure tool-call), nudge the model view
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant' && !last.content.trim()) {
            next[next.length - 1] = {
              role: 'assistant',
              content: 'یک لحظه…',
            };
          }
          return next;
        });
        setStatus('idle');
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'خطا در ارتباط با دستیار';
        if (message !== 'AbortError') {
          setError(message);
          setStatus('error');
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant' && !last.content.trim()) {
              next[next.length - 1] = { role: 'assistant', content: message };
            }
            return next;
          });
        } else {
          setStatus('idle');
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
