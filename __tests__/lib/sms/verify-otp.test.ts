import { createHash } from 'crypto';

import {
  checkSmsOtp,
  consumeSmsOtp,
  hashOtp,
  otpIdentifier,
} from '@/lib/sms/verify-otp';
import { OTP_TTL_SECONDS } from '@/lib/constants';

const hash = (code: string) => createHash('sha256').update(code).digest('hex');

// In-memory stand-in for the VerificationToken rows keyed the same way Prisma
// is, so the suite exercises the real query shapes without a database.
// Prisma's not-found sentinel is a rejected promise (P2025); the production
// code catches it, so the mock must reproduce that rather than return null.
let rows: Map<string, Date> = new Map();

jest.mock('@/db/prisma', () => ({
  prisma: {
    verificationToken: {
      findUnique: jest.fn(({ where }) => {
        const { identifier, token } = where.identifier_token;
        const expires = rows.get(`${identifier}|${token}`);
        return expires
          ? Promise.resolve({ identifier, token, expires })
          : Promise.reject(new Error('P2025'));
      }),
      delete: jest.fn(({ where }) => {
        const { identifier, token } = where.identifier_token;
        const expires = rows.get(`${identifier}|${token}`);
        if (!expires) return Promise.reject(new Error('P2025'));
        rows.delete(`${identifier}|${token}`);
        return Promise.resolve({ identifier, token, expires });
      }),
    },
  },
}));

const PHONE = '+989121234567';
const CODE = '042317';

function issue(phone = PHONE, code = CODE, ttlMs = OTP_TTL_SECONDS * 1000) {
  const identifier = otpIdentifier(phone);
  rows.set(`${identifier}|${hash(code)}`, new Date(Date.now() + ttlMs));
}

beforeEach(() => {
  rows = new Map();
});

describe('identifier scoping', () => {
  it('namespaces OTP codes by phone', () => {
    expect(otpIdentifier(PHONE)).toBe(`otp:${PHONE}`);
  });

  it('cannot collide with password-reset identifiers', () => {
    expect(otpIdentifier(PHONE)).not.toBe(`pwreset:${PHONE}`);
  });
});

describe('hashOtp', () => {
  it('is deterministic and 64 hex chars', () => {
    expect(hashOtp('123456')).toBe(hashOtp('123456'));
    expect(hashOtp('123456')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs per code', () => {
    expect(hashOtp('123456')).not.toBe(hashOtp('654321'));
  });
});

describe('checkSmsOtp — verifies WITHOUT consuming', () => {
  it('accepts a correct, unexpired code', async () => {
    issue();
    await expect(checkSmsOtp(PHONE, CODE)).resolves.toBe('valid');
  });

  it('reports an expired code distinctly from a wrong one', async () => {
    issue(PHONE, CODE, -1000); // already past expiry
    await expect(checkSmsOtp(PHONE, CODE)).resolves.toBe('expired');
    await expect(checkSmsOtp(PHONE, '000000')).resolves.toBe('invalid');
  });

  it('reports an unknown code as invalid', async () => {
    issue();
    await expect(checkSmsOtp(PHONE, '000000')).resolves.toBe('invalid');
  });

  it('leaves the row intact so the code can still be consumed', async () => {
    issue();
    await checkSmsOtp(PHONE, CODE);
    await expect(consumeSmsOtp(PHONE, CODE)).resolves.toBe('valid');
  });

  it('does not accept a code issued to a different number', async () => {
    issue('+989121111111', CODE);
    await expect(checkSmsOtp(PHONE, CODE)).resolves.toBe('invalid');
  });
});

describe('consumeSmsOtp — verifies AND deletes', () => {
  it('accepts a correct, unexpired code', async () => {
    issue();
    await expect(consumeSmsOtp(PHONE, CODE)).resolves.toBe('valid');
  });

  it('rejects replay after the first consumption', async () => {
    issue();
    await expect(consumeSmsOtp(PHONE, CODE)).resolves.toBe('valid');
    await expect(consumeSmsOtp(PHONE, CODE)).resolves.toBe('invalid');
  });

  it('rejects an expired code AND burns it', async () => {
    issue(PHONE, CODE, -1000);
    await expect(consumeSmsOtp(PHONE, CODE)).resolves.toBe('expired');
    // The delete is what makes the check atomic, so an expired code is
    // unreusable afterwards — the next call sees no row at all.
    await expect(consumeSmsOtp(PHONE, CODE)).resolves.toBe('invalid');
  });
});

describe('the invariant this feature exists to restore', () => {
  it('a sign-up can check then consume the same code exactly once', async () => {
    issue();
    // Pre-creation gate authorizes without spending...
    await expect(checkSmsOtp(PHONE, CODE)).resolves.toBe('valid');
    // ...and session establishment spends it once, successfully.
    await expect(consumeSmsOtp(PHONE, CODE)).resolves.toBe('valid');
  });

  it('a second consume in the same attempt fails (the original defect)', async () => {
    issue();
    await consumeSmsOtp(PHONE, CODE);
    // This is what used to happen: signUpUser consumed, then the SMS
    // provider's authorize() consumed again and always failed.
    await expect(consumeSmsOtp(PHONE, CODE)).resolves.toBe('invalid');
  });
});

describe('dev master code (no SMS provider configured)', () => {
  it('verifies 123456 without touching the database', async () => {
    await expect(checkSmsOtp(PHONE, '123456')).resolves.toBe('valid');
    await expect(consumeSmsOtp(PHONE, '123456')).resolves.toBe('valid');
  });

  it('is rejected once a provider IS configured', async () => {
    const prev = process.env.SMSIR_API_KEY;
    process.env.SMSIR_API_KEY = 'test-key';
    jest.resetModules();
    // isSmsConfigured is read per call, so re-import to pick up the env
    const { checkSmsOtp: configured } = await import('@/lib/sms/verify-otp');
    await expect(configured(PHONE, '123456')).resolves.toBe('invalid');
    if (prev === undefined) delete process.env.SMSIR_API_KEY;
    else process.env.SMSIR_API_KEY = prev;
  });
});

describe('OTP_TTL_SECONDS', () => {
  it('is two minutes', () => {
    expect(OTP_TTL_SECONDS).toBe(120);
  });
});
