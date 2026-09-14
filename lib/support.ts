import { prisma } from '@/db/prisma';

// Messages older than this are hidden and pruned lazily
export const SUPPORT_RETENTION_DAYS = 30;
export const SUPPORT_BODY_MAX = 1000;

const cutoff = () =>
  new Date(Date.now() - SUPPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

export type SupportMessageDto = {
  id: string;
  body: string;
  fromAdmin: boolean;
  isRead: boolean;
  createdAt: Date;
};

// One thread per user: unread counts + message lists in one place.
// Server-only (imports prisma); UI pages import these via server components.

export async function getSupportThread(userId: string, limit = 100) {
  // Lazy prune: drop messages past the retention window on read
  await prisma.supportMessage.deleteMany({ where: { createdAt: { lt: cutoff() } } });

  const [messages, unreadForUser, unreadForAdmin] = await Promise.all([
    prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    }),
    prisma.supportMessage.count({
      where: { userId, fromAdmin: true, isRead: false },
    }),
    prisma.supportMessage.count({
      where: { fromAdmin: false, isRead: false, user: { role: { not: 'admin' } } },
    }),
  ]);

  return { messages, unreadForUser, unreadForAdmin };
}

export async function getUnreadSupportCountForAdmin() {
  return prisma.supportMessage.count({
    where: { fromAdmin: false, isRead: false, createdAt: { gte: cutoff() }, user: { role: { not: 'admin' } } },
  });
}
