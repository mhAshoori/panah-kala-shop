import { createHash } from 'crypto';

import { checkSmsOtp, consumeSmsOtp } from '@/lib/sms/verify-otp';
import { prisma } from '@/db/prisma';

/**
 * Regression guard for the phone sign-up defect, asserted at the action level
 * because the local UI cannot catch it: without an SMS provider configured the
 * master code 123456 verifies without touching the database, so a browser run
 * passes even while the double-consume bug is still present. This exercises a
 * real stored row, which the dev path never reaches.
 */
const hash = (code: string) => createHash('sha256').update(code).digest('hex');

const rows = new Map<string, Date>();

jest.mock('@/db/prisma', () => ({
  prisma: {
    verificationToken: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

beforeEach(() => {
  rows.clear();

  const store = prisma.verificationToken as unknown as {
    findUnique: jest.Mock;
    delete: jest.Mock;
  };

  store.findUnique.mockImplementation(({ where }) => {
    const { identifier, token } = where.identifier_token as {
      identifier: string;
      token: string;
    };
    const expires = rows.get(`${identifier}|${token}`);
    return expires
      ? Promise.resolve({ expires })
      : Promise.reject(new Error('P2025'));
  });

  store.delete.mockImplementation(({ where }) => {
    const { identifier, token } = where.identifier_token as {
      identifier: string;
      token: string;
    };
    const expires = rows.get(`${identifier}|${token}`);
    if (!expires) return Promise.reject(new Error('P2025'));
    rows.delete(`${identifier}|${token}`);
    return Promise.resolve({ expires });
  });
});

const PHONE = '+989120000099';
const CODE = '042317';

function issue(ttlMs = 120_000) {
  rows.set(`otp:${PHONE}|${hash(CODE)}`, new Date(Date.now() + ttlMs));
}

describe('phone sign-up consumption order', () => {
  it('authorizes without spending, then spends exactly once', async () => {
    issue();

    // The pre-creation gate must NOT spend the code — an account is about to
    // exist that still needs a session established from it.
    expect(await checkSmsOtp(PHONE, CODE)).toBe('valid');
    expect(rows.size).toBe(1);

    // Session establishment spends it, successfully. This is the call that
    // used to fail, because signUpUser had already deleted the row.
    expect(await consumeSmsOtp(PHONE, CODE)).toBe('valid');
    expect(rows.size).toBe(0);
  });

  it('rejects a second spend in the same attempt', async () => {
    issue();

    expect(await consumeSmsOtp(PHONE, CODE)).toBe('valid');
    // This is exactly what the old code did: signUpUser consumed, then the
    // SMS provider's authorize() consumed again. It always failed in
    // production, and that failure was reported as success.
    expect(await consumeSmsOtp(PHONE, CODE)).toBe('invalid');
  });

  it('refuses an expired code at both stages', async () => {
    issue(-1000);

    expect(await checkSmsOtp(PHONE, CODE)).toBe('expired');
    expect(await consumeSmsOtp(PHONE, CODE)).toBe('expired');
  });
});
