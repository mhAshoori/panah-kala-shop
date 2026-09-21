'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/db/prisma';
import { requireAdmin } from '../auth-guard';
import { recordNotification } from '../notifications';
import { getValidUserId } from '../auth-helpers';
import { withActionMessage } from '../action-messages';
import {
  SUPPORT_BODY_MAX,
  SUPPORT_RETENTION_DAYS,
  getSupportThread,
  getUnreadSupportCountForAdmin,
  type SupportMessageDto,
} from '../support';

const cutoff = () =>
  new Date(Date.now() - SUPPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// User side
// ---------------------------------------------------------------------------

// Send a support message from the chat widget (must be signed in)
export async function sendSupportMessage(body: string): Promise<{
  success: boolean;
  message?: string;
  unreadForUser?: number;
}> {
  try {
    const userId = await getValidUserId();
    if (!userId) {
      return { success: false, message: await withActionMessage('sessionExpired') };
    }

    const text = body.trim().slice(0, SUPPORT_BODY_MAX);
    if (text.length < 2) {
      return { success: false, message: await withActionMessage('invalidValue') };
    }

    await prisma.supportMessage.create({
      data: { userId, body: text, fromAdmin: false },
    });

    // Fire-and-forget admin notification (in-panel row, same pattern as orders)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, mobile: true, email: true },
    });
    recordNotification({
      type: 'question',
      title: 'پیام پشتیبانی جدید',
      body: `سوال کاربر ${user?.name ?? 'کاربر'} — «${text.slice(0, 80)}»`,
      data: { userId },
    });

    revalidatePath('/admin/support');

    const thread = await prisma.supportMessage.count({
      where: { userId, fromAdmin: true, isRead: false },
    });
    return { success: true, unreadForUser: thread };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

// Fetch own thread (for polling in the chat widget)
export async function fetchMySupportThread(): Promise<{
  success: boolean;
  messages?: { id: string; body: string; fromAdmin: boolean; isRead: boolean; createdAt: string }[];
  unreadForUser?: number;
}> {
  const userId = await getValidUserId();
  if (!userId) return { success: false };

  const { messages, unreadForUser } = await getSupportThread(userId);
  return {
    success: true,
    messages: messages
      .filter((m: SupportMessageDto) => m.createdAt >= cutoff())
      .map((m: SupportMessageDto) => ({
        id: m.id,
        body: m.body,
        fromAdmin: m.fromAdmin,
        isRead: m.isRead,
        createdAt: m.createdAt.toISOString(),
      })),
    unreadForUser,
  };
}

// Mark admin replies as read (user opened the thread)
export async function markSupportReadForUser() {
  const userId = await getValidUserId();
  if (!userId) return { success: false };
  await prisma.supportMessage.updateMany({
    where: { userId, fromAdmin: true, isRead: false },
    data: { isRead: true },
  });
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin side
// ---------------------------------------------------------------------------

// List support threads grouped by user (threads = recent messages)
export async function getAdminSupportThreads({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) {
  await requireAdmin();
  const cutoff = new Date(Date.now() - SUPPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.supportMessage.deleteMany({ where: { createdAt: { lt: cutoff } } });

  const users = await prisma.supportMessage.groupBy({
    by: ['userId'],
    where: { user: { role: { not: 'admin' } }, createdAt: { gte: cutoff } },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: 'desc' } },
    skip: (page - 1) * limit,
    take: limit,
  });

  return Promise.all(
    users.map(async (u) => {
      const [user, messages, unreadForAdmin] = await Promise.all([
        prisma.user.findUnique({
          where: { id: u.userId },
          select: { id: true, name: true, email: true, mobile: true },
        }),
        prisma.supportMessage.findMany({
          where: { userId: u.userId, createdAt: { gte: cutoff } },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.supportMessage.count({
          where: { userId: u.userId, fromAdmin: false, isRead: false },
        }),
      ]);
      return { user, messages, unreadForAdmin };
    })
  );
}

// Admin replies on a user's thread
export async function adminReplySupportMessage(userId: string, body: string) {
  await requireAdmin();
  const text = body.trim().slice(0, SUPPORT_BODY_MAX);
  if (text.length < 2 || !userId) {
    return { success: false as const, message: 'invalid' };
  }
  await prisma.supportMessage.create({
    data: { userId, body: text, fromAdmin: true },
  });
  revalidatePath('/admin/support');
  return { success: true as const };
}

// Mark a user's messages read for admin (badge clears)
export async function markSupportReadForAdmin(userId: string) {
  await requireAdmin();
  await prisma.supportMessage.updateMany({
    where: { userId, fromAdmin: false, isRead: false },
    data: { isRead: true },
  });
  await prisma.notification.updateMany({
    where: { type: 'support', isRead: false },
    data: { isRead: true },
  });
  revalidatePath('/admin/support');
  revalidatePath('/admin');
  return { success: true as const };
}

export async function getUnreadSupportCount() {
  await requireAdmin();
  return getUnreadSupportCountForAdmin();
}
