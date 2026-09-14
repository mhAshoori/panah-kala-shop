'use client';

// Floating RTL chat widget for the storefront. Persian-first UI, lazy
// mounted (only after the user opens it), mobile-friendly.
// Two modes via a segmented toggle (same pattern as the sign-in form):
//  - AI assistant: streaming chat via /api/assistant/chat
//  - Support team: persisted messages to the store's support team
//    (sign-in gated; replies appear in the same thread, retention 30 days)

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bot,
  Headset,
  Loader2,
  RotateCcw,
  SendHorizonal,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAssistant } from '@/lib/ai/use-assistant';
import MessageContent from '@/components/shared/assistant/message-content';
import {
  fetchMySupportThread,
  markSupportReadForUser,
  sendSupportMessage,
} from '@/lib/actions/support.actions';
import { formatDateTime } from '@/lib/utils';

const SUGGESTIONS = [
  'گوشی زیر ۳۰ میلیون معرفی کن',
  'هزینه ارسال چقدره؟',
  'ایرپاد دارید؟',
];

type Mode = 'ai' | 'support';

type SupportMessage = {
  id: string;
  body: string;
  fromAdmin: boolean;
  isRead: boolean;
  createdAt: string;
};

const ChatWidget = ({ isAuthed = false }: { isAuthed?: boolean }) => {
  const t = useTranslations('assistant');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('ai');

  // AI assistant state
  const [input, setInput] = useState('');
  const { messages, status, error, send, stop, reset } =
    useAssistant('storefront');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Support state
  const [supportThread, setSupportThread] = useState<SupportMessage[]>([]);
  const [supportStatus, setSupportStatus] = useState<
    'idle' | 'loading' | 'error' | 'sending'
  >('idle');

  const refreshThread = useCallback(async () => {
    const res = await fetchMySupportThread();
    if (res.success && res.messages) {
      setSupportThread(res.messages);
      setSupportStatus('idle');
      await markSupportReadForUser();
    } else {
      setSupportStatus('error');
    }
  }, []);

  // Poll for admin replies while the support thread is open
  useEffect(() => {
    if (!open || mode !== 'support' || !isAuthed) return;
    let alive = true;
    const tick = async () => {
      const res = await fetchMySupportThread();
      if (!alive) return;
      if (res.success && res.messages) {
        setSupportThread(res.messages);
        setSupportStatus('idle');
        await markSupportReadForUser();
      } else {
        setSupportStatus('error');
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), 10_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [open, mode, isAuthed]);

  // Keep the latest message in view
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, supportThread]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, mode]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    if (mode === 'ai') {
      send(text);
      return;
    }
    if (!isAuthed) return;
    setSupportStatus('sending');
    void sendSupportMessage(text).then((res) => {
      if (res.success) {
        setSupportStatus('idle');
        void refreshThread();
      } else {
        setSupportStatus('error');
      }
    });
  };

  return (
    <>
      {/* Launcher */}
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        aria-label={t('open')}
        className={cn(
          'fixed bottom-5 start-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105',
          open && 'hidden'
        )}
      >
        <Bot className='h-7 w-7' />
      </button>

      {/* Panel — centered bottom sheet on small screens, side panel from sm up */}
      {open && (
        <div
          dir='rtl'
          className='fixed inset-x-4 bottom-4 z-50 flex h-[min(560px,80vh)] w-auto flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl sm:left-auto sm:right-auto sm:bottom-5 sm:start-5 sm:w-[380px]'
        >
          {/* Header */}
          <div className='flex items-center justify-between border-b p-3'>
            <div className='flex items-center gap-2'>
              <span className='flex h-9 w-9 items-center justify-center rounded-full bg-primary/10'>
                {mode === 'ai' ? (
                  <Bot className='h-5 w-5 text-primary' />
                ) : (
                  <Headset className='h-5 w-5 text-primary' />
                )}
              </span>
              <div>
                <p className='text-sm font-semibold'>
                  {mode === 'ai' ? t('title') : t('support')}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {mode === 'ai' ? t('subtitle') : tCommon('brand')}
                </p>
              </div>
            </div>
            <div className='flex gap-1'>
              {mode === 'ai' && (
                <Button
                  size='icon'
                  variant='ghost'
                  aria-label={t('reset')}
                  onClick={reset}
                  disabled={status === 'streaming'}
                >
                  <RotateCcw className='h-4 w-4' />
                </Button>
              )}
              <Button
                size='icon'
                variant='ghost'
                aria-label={t('close')}
                onClick={() => setOpen(false)}
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>

          {/* Mode tabs — same segmented pattern as the sign-in form toggle */}
          <div className='grid grid-cols-2 gap-2 border-b bg-muted/60 p-2'>
            <button
              type='button'
              onClick={() => setMode('ai')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
                mode === 'ai' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              <Bot className='h-3.5 w-3.5' />
              {t('aiAssist')}
            </button>
            <button
              type='button'
              onClick={() => setMode('support')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
                mode === 'support'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              <Headset className='h-3.5 w-3.5' />
              {t('support')}
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className='flex-1 space-y-3 overflow-y-auto p-3 text-sm'
          >
            {mode === 'ai' && messages.length === 0 && (
              <div className='space-y-2 pt-4'>
                <p className='text-center text-muted-foreground'>
                  {t('greeting')}
                </p>
                <div className='flex flex-col gap-2 pt-2'>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type='button'
                      onClick={() => send(s)}
                      className='rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mode === 'ai' &&
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed text-right',
                    m.role === 'user'
                      ? 'me-auto bg-primary text-primary-foreground'
                      : 'ms-auto bg-muted'
                  )}
                >
                  {m.role === 'assistant' && m.content ? (
                    <MessageContent content={m.content} />
                  ) : (
                    m.content || (
                      <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                    )
                  )}
                </div>
              ))}

            {mode === 'support' && !isAuthed && (
              <p className='pt-6 text-center text-sm text-muted-foreground'>
                {t('signInToContact')}
              </p>
            )}

            {mode === 'support' && isAuthed && (
              <>
                {supportThread.length === 0 && supportStatus === 'loading' && (
                  <Loader2 className='mx-auto mt-8 h-4 w-4 animate-spin text-muted-foreground' />
                )}
                {supportThread.length === 0 &&
                  (supportStatus === 'idle' || supportStatus === 'sending') && (
                    <p className='pt-6 text-center text-muted-foreground'>
                      {t('supportGreeting')}
                    </p>
                  )}
                {supportStatus === 'error' && (
                  <p className='pt-6 text-center text-xs text-destructive'>
                    {tCommon('errorHint')}
                  </p>
                )}
                {supportThread.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed',
                      m.fromAdmin
                        ? 'ms-auto bg-muted text-right'
                        : 'me-auto bg-primary text-primary-foreground'
                    )}
                  >
                    {m.body}
                    <span
                      className={cn(
                        'mt-1 block text-[10px]',
                        m.fromAdmin
                          ? 'text-muted-foreground'
                          : 'text-primary-foreground/70'
                      )}
                    >
                      {formatDateTime(m.createdAt, 'fa').dateOnly}
                    </span>
                  </div>
                ))}
                {supportStatus === 'sending' && (
                  <div className='me-auto flex max-w-[85%] items-center gap-2 rounded-2xl bg-primary px-3 py-2 text-primary-foreground'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                  </div>
                )}
              </>
            )}

            {mode === 'ai' && error && (
              <p className='text-center text-xs text-destructive'>{error}</p>
            )}
          </div>

          {/* Composer — hidden in support mode until signed in */}
          {!(mode === 'support' && !isAuthed) && (
            <form onSubmit={submit} className='flex items-center gap-2 border-t p-3'>
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  mode === 'ai' ? t('placeholder') : t('supportPlaceholder')
                }
                maxLength={600}
                dir='rtl'
                disabled={status === 'streaming' || supportStatus === 'sending'}
                className='flex-1 text-right'
              />
              {mode === 'ai' && status === 'streaming' ? (
                <Button
                  type='button'
                  size='icon'
                  variant='outline'
                  aria-label={t('stop')}
                  onClick={stop}
                >
                  <Loader2 className='h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <Button type='submit' size='icon' aria-label={t('send')}>
                  <SendHorizonal className='h-4 w-4 rtl:-scale-x-100' />
                </Button>
              )}
            </form>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
