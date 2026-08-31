'use client';

// Admin panel AI assistant: same streaming backend with the read-only
// analytics persona. Mounted inside the admin sidebar (desktop) and opens
// as a side panel; on mobile it opens full-width.

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, Loader2, RotateCcw, SendHorizonal, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAssistant } from '@/lib/ai/use-assistant';

const SUGGESTIONS = [
  'فروش ۳۰ روز گذشته چطور بوده؟',
  'کدوم کالاها کم مونده؟',
  'آخرین سفارش‌ها رو بگو',
];

const AdminChat = () => {
  const t = useTranslations('assistant');
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, status, error, send, stop, reset } = useAssistant('admin');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    send(input);
    setInput('');
  };

  return (
    <>
      <Button
        variant='ghost'
        size='sm'
        className='w-full justify-start gap-2'
        onClick={() => setOpen(true)}
      >
        <Sparkles className='h-4 w-4 text-primary' />
        {t('adminOpen')}
      </Button>

      {open && (
        <div
          dir='rtl'
          className='fixed inset-y-0 end-0 z-50 flex h-full w-[min(420px,100vw)] flex-col border-s bg-card shadow-2xl'
        >
          {/* Header */}
          <div className='flex items-center justify-between border-b p-3'>
            <div className='flex items-center gap-2'>
              <span className='flex h-9 w-9 items-center justify-center rounded-full bg-primary/10'>
                <Bot className='h-5 w-5 text-primary' />
              </span>
              <div>
                <p className='text-sm font-semibold'>{t('adminTitle')}</p>
                <p className='text-xs text-muted-foreground'>
                  {t('adminSubtitle')}
                </p>
              </div>
            </div>
            <div className='flex gap-1'>
              <Button
                size='icon'
                variant='ghost'
                aria-label={t('reset')}
                onClick={reset}
                disabled={status === 'streaming'}
              >
                <RotateCcw className='h-4 w-4' />
              </Button>
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

          {/* Messages */}
          <div
            ref={scrollRef}
            className='flex-1 space-y-3 overflow-y-auto p-3 text-sm'
          >
            {messages.length === 0 && (
              <div className='space-y-2 pt-4'>
                <p className='text-center text-muted-foreground'>
                  {t('adminGreeting')}
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
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed',
                  m.role === 'user'
                    ? 'ms-auto bg-primary text-primary-foreground'
                    : 'me-auto bg-muted'
                )}
              >
                {m.content || (
                  <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                )}
              </div>
            ))}
            {error && (
              <p className='text-center text-xs text-destructive'>{error}</p>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={submit} className='flex items-center gap-2 border-t p-3'>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('placeholder')}
              maxLength={600}
              dir='auto'
              disabled={status === 'streaming'}
              className='flex-1'
            />
            {status === 'streaming' ? (
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
        </div>
      )}
    </>
  );
};

export default AdminChat;
