import { cache } from 'react';

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

/**
 * Resolve the session user's id — but only when that user actually exists in
 * the database. Stale JWT sessions (e.g. after a database reseed) are treated
 * as guests instead of causing FK violations on cart/review/order writes.
 */
export const getValidUserId = cache(async (): Promise<string | undefined> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return undefined;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  return user ? id : undefined;
});
