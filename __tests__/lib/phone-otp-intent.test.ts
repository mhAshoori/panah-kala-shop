import {
  decideOtpSend,
  type OtpIntent,
  type PhoneAccountStatus,
} from '@/lib/phone-otp-intent';

/**
 * The whole point of this suite: "should this number get a code?" had no single
 * answer in 007. The shared component refused on registered, the sign-in caller
 * refused on unregistered, and phone sign-in rejected every number while the
 * gate stayed green. Nothing asserted the decision, only the sending.
 *
 * Every row of the truth table is asserted explicitly. No snapshots — a
 * snapshot passes unchanged when the table itself is wrong, which is exactly
 * how that defect shipped.
 */

const SEND: ReturnType<typeof decideOtpSend> = {
  canSend: true,
  messageKey: null,
  redirectTo: null,
};

const REFUSE_SIGN_UP = {
  canSend: false,
  messageKey: 'phoneNotRegistered',
  redirectTo: 'sign-up',
};

const REFUSE_SIGN_IN = {
  canSend: false,
  messageKey: 'phoneAlreadyRegistered',
  redirectTo: 'sign-in',
};

const REFUSE_FAILED = {
  canSend: false,
  messageKey: 'phoneCheckFailed',
  redirectTo: null,
};

const INTENTS: OtpIntent[] = ['sign-in', 'register'];
const STATUSES: PhoneAccountStatus[] = ['active', 'none', 'banned', 'unknown'];

/** Every (intent, status) pair — the table's complete domain. */
const ALL = INTENTS.flatMap((intent) =>
  STATUSES.map((status) => [intent, status] as const)
);

describe('decideOtpSend — the full truth table', () => {
  // --- sign-in: a registered number is the EXPECTED case, not a problem ---

  it('sign-in + active → send the code (the regression this feature fixes)', () => {
    expect(decideOtpSend('sign-in', 'active')).toEqual(SEND);
  });

  it('sign-in + banned → send the code; refusal happens at verification', () => {
    expect(decideOtpSend('sign-in', 'banned')).toEqual(SEND);
  });

  it('sign-in + none → refuse and point at sign-up', () => {
    expect(decideOtpSend('sign-in', 'none')).toEqual(REFUSE_SIGN_UP);
  });

  it('sign-in + unknown → refuse with a retry message, not "unregistered"', () => {
    expect(decideOtpSend('sign-in', 'unknown')).toEqual(REFUSE_FAILED);
  });

  // --- register: a registered number IS a problem ---

  it('register + active → refuse and point at sign-in', () => {
    expect(decideOtpSend('register', 'active')).toEqual(REFUSE_SIGN_IN);
  });

  it('register + banned → refuse; the number is taken, that is all it says', () => {
    expect(decideOtpSend('register', 'banned')).toEqual(REFUSE_SIGN_IN);
  });

  it('register + none → send the code', () => {
    expect(decideOtpSend('register', 'none')).toEqual(SEND);
  });

  it('register + unknown → refuse with a retry message', () => {
    expect(decideOtpSend('register', 'unknown')).toEqual(REFUSE_FAILED);
  });
});

describe('the two rows that were previously wrong', () => {
  it('never refuses a registered number on the sign-in page', () => {
    // This is the exact dead end: "already registered — please sign in" shown
    // to someone already on the sign-in page, with no code sent.
    expect(decideOtpSend('sign-in', 'active').canSend).toBe(true);
    expect(decideOtpSend('sign-in', 'active').messageKey).toBeNull();
  });

  it('still refuses a registered number on the sign-up page', () => {
    // Guards against the fix over-correcting and opening a duplicate hole.
    expect(decideOtpSend('register', 'active').canSend).toBe(false);
  });

  it('gives the same number opposite answers on the two pages', () => {
    expect(decideOtpSend('sign-in', 'active').canSend).toBe(
      !decideOtpSend('register', 'active').canSend
    );
    expect(decideOtpSend('sign-in', 'none').canSend).toBe(
      !decideOtpSend('register', 'none').canSend
    );
  });
});

describe('internal consistency', () => {
  it.each(ALL)('%s + %s: a refusal always carries a message', (intent, status) => {
    const d = decideOtpSend(intent, status);
    if (!d.canSend) expect(d.messageKey).not.toBeNull();
  });

  it.each(ALL)('%s + %s: permission never carries a message', (intent, status) => {
    const d = decideOtpSend(intent, status);
    if (d.canSend) {
      expect(d.messageKey).toBeNull();
      expect(d.redirectTo).toBeNull();
    }
  });

  it.each(ALL)('%s + %s: every refusal names somewhere to go or something to retry', (intent, status) => {
    const d = decideOtpSend(intent, status);
    if (!d.canSend) {
      expect(d.messageKey !== null || d.redirectTo !== null).toBe(true);
    }
  });
});

describe('banned handling (FR-008)', () => {
  it('is never reported as unregistered on either page', () => {
    // Telling a banned shopper their number is unregistered points them at
    // sign-up, where they would hit "already registered".
    for (const intent of INTENTS) {
      expect(decideOtpSend(intent, 'banned').messageKey).not.toBe(
        'phoneNotRegistered'
      );
    }
  });

  it('behaves as registered on register, and as sendable on sign-in', () => {
    expect(decideOtpSend('register', 'banned')).toEqual(
      decideOtpSend('register', 'active')
    );
    expect(decideOtpSend('sign-in', 'banned')).toEqual(
      decideOtpSend('sign-in', 'active')
    );
  });
});

describe('unknown handling (FR-009)', () => {
  it('never claims the number is unregistered', () => {
    // A throttled lookup has not run, so "unregistered" is a false statement.
    for (const intent of INTENTS) {
      expect(decideOtpSend(intent, 'unknown').messageKey).toBe(
        'phoneCheckFailed'
      );
    }
  });

  it('refuses to send on both pages', () => {
    for (const intent of INTENTS) {
      expect(decideOtpSend(intent, 'unknown').canSend).toBe(false);
    }
  });
});

describe('purity (R5 — no hidden state, no clock)', () => {
  it('returns equal results for equal inputs across repeated calls', () => {
    for (const [intent, status] of ALL) {
      const first = decideOtpSend(intent, status);
      const second = decideOtpSend(intent, status);
      expect(second).toEqual(first);
    }
  });
});
