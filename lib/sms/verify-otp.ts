import { createHash } from 'crypto';
import { prisma } from '@/db/prisma';
import { isSmsConfigured } from './smsir';

/**
 * Single-use SMS OTP verification. Codes are stored SHA-256 hashed (same
 * scheme as password-reset tokens) and consumed on first successful use —
 * a captured code can never be replayed within its TTL. Dev/CI keeps the
 * fixed master code 123456 when no SMS provider is configured.
 */
export async function consumeSmsOtp(phone: string, code: string): Promise<boolean> {
  if (!isSmsConfigured() && code === '123456') return true;

  const hashed = createHash('sha256').update(code).digest('hex');
  try {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: `otp:${phone}`,
          token: hashed,
        },
      },
    });
    return true;
  } catch {
    // P2025 (no row) — wrong, expired, or already-consumed code
    return false;
  }
}
