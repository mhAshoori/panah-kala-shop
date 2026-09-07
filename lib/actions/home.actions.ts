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
    const positions = new Map<string, number>();
    for (const r of rows) {
      if ((HOME_BLOCK_KEYS as readonly string[]).includes(r.key)) {
        positions.set(r.key, r.position ?? Infinity);
      }
    }
    // Every block must have a concrete position before swapping
    HOME_BLOCK_KEYS.forEach((k, i) => {
      if (positions.get(k) === Infinity || positions.get(k) === undefined) {
        positions.set(k, i);
      }
    });

    const order = [...HOME_BLOCK_KEYS].sort(
      (a, b) => positions.get(a)! - positions.get(b)!
    );
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
