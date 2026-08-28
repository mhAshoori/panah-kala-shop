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
