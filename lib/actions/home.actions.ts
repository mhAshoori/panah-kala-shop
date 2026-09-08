'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { InputJsonValue } from '@/lib/generated/prisma/internal/prismaNamespace';

import { prisma } from '@/db/prisma';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
import {
  HOME_BLOCK_KEYS,
  EXTRA_BLOCK_KEYS,
} from '../home-content';
import type { ActionState } from '@/types';

// Whitelisted block keys
const blockKeySchema = z.enum([...HOME_BLOCK_KEYS, ...EXTRA_BLOCK_KEYS]);

// Block payloads are JSON objects stored verbatim (validated as records)
const blockDataSchema = z.record(z.string(), z.unknown());

// Save a homepage block (admin)
export async function updateHomeBlock(
  key: string,
  enabled: boolean,
  data: Record<string, unknown>
): Promise<ActionState> {
  try {
    await requireAdmin();

    const blockKey = blockKeySchema.parse(key);
    const blockData = blockDataSchema.parse(data) as {
      [key: string]: unknown;
    };

    await prisma.homeBlock.upsert({
      where: { key: blockKey },
      create: {
        key: blockKey,
        enabled,
        data: blockData as unknown as InputJsonValue,
      },
      update: {
        enabled,
        data: blockData as unknown as InputJsonValue,
      },
    });

    revalidatePath('/', 'layout');
    revalidatePath('/admin/homepage');

    return { success: true, message: await withActionMessage('homeSaved') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Invalid block data',
    };
  }
}

// Reorder a homepage block (admin): moves the block one slot up/down by
// rewriting the position column of the full block list in a transaction.
export async function moveHomeBlock(
  key: string,
  direction: 'up' | 'down'
): Promise<ActionState> {
  try {
    await requireAdmin();

    const blockKey = blockKeySchema.parse(key);
    if (!(HOME_BLOCK_KEYS as readonly string[]).includes(blockKey)) {
      throw new Error('Not a homepage block');
    }
    const homeKey = blockKey as (typeof HOME_BLOCK_KEYS)[number];

    const rows = await prisma.homeBlock.findMany({
      select: { key: true, position: true },
    });
    const stored = new Map<string, number>();
    for (const r of rows) {
      if (
        (HOME_BLOCK_KEYS as readonly string[]).includes(r.key) &&
        r.position != null
      ) {
        stored.set(r.key, r.position);
      }
    }
    // Blocks without a stored position sort after all positioned ones,
    // keeping HOME_BLOCK_KEYS order among themselves — never reuse stored
    // index values (they collide with real positions and scramble moves)
    const order = [...HOME_BLOCK_KEYS].sort((a, b) => {
      const pa = stored.get(a) ?? Number.MAX_SAFE_INTEGER;
      const pb = stored.get(b) ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      return HOME_BLOCK_KEYS.indexOf(a) - HOME_BLOCK_KEYS.indexOf(b);
    });
    const idx = order.indexOf(homeKey);
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= order.length) {
      return { success: true, message: 'noop' };
    }
    [order[idx], order[swapWith]] = [order[swapWith], order[idx]];

    await prisma.$transaction(
      order.map((k, i) =>
        prisma.homeBlock.upsert({
          where: { key: k },
          create: { key: k, enabled: true, data: {}, position: i },
          update: { position: i },
        })
      )
    );

    revalidatePath('/', 'layout');
    revalidatePath('/admin/homepage');

    return { success: true, message: await withActionMessage('homeSaved') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Invalid block data',
    };
  }
}

// Fetch all stored homepage blocks (admin)
export async function getHomeBlocksAdmin() {
  await requireAdmin();

  const rows = await prisma.homeBlock.findMany();
  return JSON.parse(JSON.stringify(rows)) as {
    key: string;
    enabled: boolean;
    data: Record<string, unknown>;
  }[];
}
