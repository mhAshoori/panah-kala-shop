'use client';

// Admin activity toasts: polls fetchAdminActivitySince every 30s, dedupes by
// event id (session scope), caps toasts per tick with an aggregate overflow
// toast. Mounted once in the admin layout.

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { toast } from 'sonner';

import { fetchAdminActivitySince } from '@/lib/actions/notify.actions';
import {
  MAX_EVENTS_PER_TICK,
  diffEvents,
  aggregateOverflow,
  type AdminActivityEvent,
} from '@/lib/notify';

const POLL_MS = 30_000;

const kindKey: Record<AdminActivityEvent['kind'], string> = {
  order: 'toastOrderPlaced',
  payment: 'toastPaymentReceived',
  signup: 'toastUserSignedUp',
  question: 'toastQuestionAsked',
  lowStock: 'toastLowStock',
};

// ponytail: payments mapped to success copy; server doesn't distinguish
// paid-vs-failed (paymentResult Json). Add failure kind when needed.
const eventLinkKey: Record<AdminActivityEvent['kind'], string> = {
  order: 'orders',
  payment: 'orders',
  signup: 'users',
  question: 'support',
  lowStock: 'products',
};

const AdminNotifications = () => {
  const t = useTranslations('admin');
  const since = useRef<string>(new Date().toISOString());
  const shown = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const res = await fetchAdminActivitySince(since.current);
      if (!alive || !res.success) return;
      since.current = new Date().toISOString();

      const seen = diffEvents(res.events, shown.current);
      if (seen.length === 0) return;

      seen.forEach((e) => {
        toast(t(kindKey[e.kind as AdminActivityEvent['kind']]), {
          description: (
            <Link
              href={e.href}
              className='underline underline-offset-4'
            >
              {t(eventLinkKey[e.kind as AdminActivityEvent['kind']])}
            </Link>
          ),
          duration: 10_000,
        });
      });

      const overflow = aggregateOverflow(res.events.length);
      if (overflow > 0) {
        toast(t('toastMoreEvents', { count: overflow }), { duration: 10_000 });
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [t]);

  return null;
};

export default AdminNotifications;
