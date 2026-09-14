'use client';

// Admin support inbox: one card per user thread, reply inline, unread badge
// per thread. Replies persist on the user's thread and show in their widget.

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Headset, Inbox, Loader2, SendHorizonal } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  adminReplySupportMessage,
  markSupportReadForAdmin,
  getAdminSupportThreads,
} from '@/lib/actions/support.actions';
import { formatDateTime } from '@/lib/utils';

export type AdminSupportThread = Awaited<
  ReturnType<typeof getAdminSupportThreads>
>[number];

const AdminSupportClient = ({
  initialThreads,
}: {
  initialThreads: AdminSupportThread[];
}) => {
  const t = useTranslations('admin');
  const [threads, setThreads] = useState(initialThreads);
  const [openId, setOpenId] = useState<string | null>(
    initialThreads[0]?.user?.id ?? null
  );
  const [reply, setReply] = useState('');
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>, successMsg?: string) =>
    startTransition(async () => {
      try {
        await fn();
        if (successMsg) toast.success(successMsg);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    });

  const openThread = (userId: string) => {
    setOpenId(userId);
    setReply('');
    const thread = threads.find((x) => x.user?.id === userId);
    if (thread && thread.unreadForAdmin > 0) {
      void run(async () => {
        await markSupportReadForAdmin(userId);
        setThreads((prev) =>
          prev.map((x) =>
            x.user?.id === userId ? { ...x, unreadForAdmin: 0 } : x
          )
        );
      });
    }
  };

  const sendReply = (userId: string) => {
    const text = reply.trim();
    if (text.length < 2) return;
    void run(async () => {
      const res = await adminReplySupportMessage(userId, text);
      if (res.success) {
        toast.success(t('supportReplySent'));
        setThreads((prev) =>
          prev.map((x) =>
            x.user?.id === userId
              ? {
                  ...x,
                  messages: [
                    ...x.messages,
                    {
                      id: `tmp-${Date.now()}`,
                      userId: userId,
                      body: text,
                      fromAdmin: true,
                      isRead: false,
                      createdAt: new Date(),
                    },
                  ],
                }
              : x
          )
        );
        setReply('');
      } else {
        toast.error(t('error'));
      }
    });
  };

  if (threads.length === 0) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center gap-2 py-12 text-muted-foreground'>
          <Inbox className='h-10 w-10' />
          <p>{t('supportThreadsEmpty')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='grid gap-4 lg:grid-cols-[280px_1fr]'>
      {/* Thread list */}
      <div className='space-y-2'>
        {threads.map(({ user, messages, unreadForAdmin }) => {
          const last = messages[messages.length - 1];
          return (
            <button
              key={user?.id}
              type='button'
              onClick={() => openThread(user!.id)}
              className={`w-full rounded-lg border p-3 text-right transition-colors ${
                openId === user?.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted'
              }`}
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='flex min-w-0 items-center gap-2'>
                  <Headset className='h-4 w-4 shrink-0 text-muted-foreground' />
                  <span className='truncate text-sm font-medium'>
                    {user?.name || user?.email || user?.mobile}
                  </span>
                </span>
                {unreadForAdmin > 0 && (
                  <Badge className='h-5 min-w-5 justify-center px-1.5'>
                    {unreadForAdmin}
                  </Badge>
                )}
              </div>
              <p className='mt-1 truncate text-xs text-muted-foreground'>
                {(last?.fromAdmin ? 'شما: ' : '') + last?.body}
              </p>
            </button>
          );
        })}
      </div>

      {/* Open conversation */}
      {threads
        .filter(({ user }) => user?.id === openId)
        .map(({ user, messages }) => (
          <Card key={user?.id}>
            <CardContent className='flex h-[min(600px,70vh)] flex-col gap-3 p-4'>
              <div className='flex items-center justify-between border-b pb-2'>
                <div>
                  <p className='text-sm font-semibold'>{user?.name}</p>
                  <p className='text-xs text-muted-foreground' dir='ltr'>
                    {user?.email || user?.mobile}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className='flex-1 space-y-3 overflow-y-auto text-sm'>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${
                      m.fromAdmin
                        ? 'ms-auto bg-primary text-primary-foreground'
                        : 'me-auto bg-muted text-right'
                    }`}
                  >
                    {m.body}
                    <span
                      className={`mt-1 block text-[10px] ${
                        m.fromAdmin
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatDateTime(
                        m.createdAt instanceof Date
                          ? m.createdAt.toISOString()
                          : String(m.createdAt),
                        'fa'
                      ).dateOnly}
                    </span>
                  </div>
                ))}
              </div>

              {/* Composer */}
              <div className='flex items-end gap-2 border-t pt-3'>
                <Textarea
                  rows={2}
                  dir='rtl'
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t('supportReply')}
                  maxLength={1000}
                  className='text-right'
                />
                <Button
                  size='icon'
                  disabled={isPending || reply.trim().length < 2}
                  onClick={() => sendReply(user!.id)}
                  aria-label={t('reply')}
                >
                  {isPending ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <SendHorizonal className='h-4 w-4 rtl:-scale-x-100' />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
};

export default AdminSupportClient;
