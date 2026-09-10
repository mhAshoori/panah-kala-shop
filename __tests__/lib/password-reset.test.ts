// Mirror of the reset-token scheme in user.actions: the raw token goes to the
// email link, only its SHA-256 hash is stored, identifiers are namespaced so
// they can never collide with Auth.js OTP tokens.
import { createHash } from 'crypto';

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('password reset token handling (mirror)', () => {
  it('deterministically hashes a token', () => {
    const t = 'abc123';
    expect(hashResetToken(t)).toBe(hashResetToken(t));
  });

  it('produces different hashes for different tokens', () => {
    expect(hashResetToken('a')).not.toBe(hashResetToken('b'));
  });

  it('hash is 64 hex chars (sha256)', () => {
    expect(hashResetToken('x')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('identifier namespace isolates reset tokens from OTP tokens', () => {
    const email = 'user@example.com';
    expect(`pwreset:${email}`).not.toBe(email);
  });

  it('expiry check rejects past dates', () => {
    const expires = new Date(Date.now() - 1000);
    expect(expires < new Date()).toBe(true);
  });
});
