/**
 * Should this phone number get a verification code?
 *
 * One function, because the answer depends on what the shopper is TRYING to do.
 * A registered number is the expected case when signing in and a problem when
 * registering, so a boolean "is this number taken?" cannot answer it — and in
 * 007 that boolean was passed to a shared component that refused on `true`,
 * while the sign-in caller separately refused on `false`. Between them they
 * refused every number and phone sign-in did not work at all.
 *
 * Deliberately client-safe: no node: imports, no Prisma, no server-only
 * dependencies. Both auth forms are 'use client', so anything imported here
 * lands in the browser bundle.
 */

/** What the shopper is trying to do. */
export type OtpIntent = 'sign-in' | 'register';

/**
 * What the lookup learned. 'unknown' is not the same as 'none': it means the
 * lookup did not run (throttled, or the query failed), so claiming the number
 * is unregistered would be a false statement.
 */
export type PhoneAccountStatus = 'active' | 'none' | 'banned' | 'unknown';

export type OtpDecision = {
  canSend: boolean;
  /** null when the code may be sent; otherwise the message key to show */
  messageKey: string | null;
  /** where to send the shopper when the answer is a referral */
  redirectTo: 'sign-in' | 'sign-up' | null;
};

const SEND: OtpDecision = { canSend: true, messageKey: null, redirectTo: null };

const REFUSE = (
  messageKey: string,
  redirectTo: OtpDecision['redirectTo'] = null
): OtpDecision => ({ canSend: false, messageKey, redirectTo });

export function decideOtpSend(
  intent: OtpIntent,
  status: PhoneAccountStatus
): OtpDecision {
  // The lookup did not run. Refuse on both pages, and never say "unregistered"
  // on the strength of a lookup that never happened.
  if (status === 'unknown') return REFUSE('phoneCheckFailed');

  // A banned account still HOLDS the number, so registering is refused exactly
  // as for an active one. On sign-in the code is sent and the refusal happens
  // at verification, so a banned shopper is not pushed into a re-registration
  // that will fail with "already registered".
  if (status === 'banned' || status === 'active') {
    return intent === 'sign-in' ? SEND : REFUSE('phoneAlreadyRegistered', 'sign-in');
  }

  // status === 'none' — the inverse, and the row that was previously missing.
  return intent === 'sign-in' ? REFUSE('phoneNotRegistered', 'sign-up') : SEND;
}
