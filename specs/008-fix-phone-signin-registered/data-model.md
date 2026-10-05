# Phase 1 Data Model: Fix Phone Sign-In for Registered Numbers

## Schema Changes

**None.** No migration required (constitution VI satisfied without one).

The `User` model already carries everything needed: `mobile` (unique), `banned` (boolean), `email`. The defect is in how the application *reads* those fields and decides what to do, not in what is stored.

---

## Entity: Phone Number Registration Status

Not a stored entity — a computed status returned by the lookup that already exists, widened from a boolean to a three-way answer (research.md R2).

### Current shape

```ts
checkPhoneRegistered(phone: string): Promise<{ registered: boolean }>
```

Collapses three distinct situations into `false`:

| Reality | Current return | Correct return |
|---|---|---|
| Account exists, active | `registered: true` | `account: 'active'` |
| No account at all | `registered: false` | `account: 'none'` |
| Account exists, banned | `registered: false` | `account: 'banned'` |
| Lookup throttled or failed | `registered: false` | `account: 'unknown'` |

### Proposed shape

```ts
type PhoneAccountStatus = 'active' | 'none' | 'banned' | 'unknown';
checkPhoneRegistered(phone: string): Promise<{ account: PhoneAccountStatus }>
```

The two collapsed cases are the ones that matter:

- **`banned`** — the shopper exists. Telling them the number is unregistered points them at sign-up, which will fail with "already registered", and gives a banned person a route to attempt re-registration (FR-008).
- **`unknown`** — the lookup did not actually run, because the throttle returned early or the query failed. Reporting "unregistered" on a lookup that never happened is simply a false statement (FR-009).

### Query

One row read, widened from two fields to three:

```ts
const user = await prisma.user.findFirst({
  where: { mobile: normalized },
  select: { id: true, banned: true },
});
return {
  account: !user ? 'none' : user.banned ? 'banned' : 'active',
};
```

No extra round-trip: `banned` comes from the row already being read.

### Throttle interaction

The existing throttle (10 lookups / 10 minutes per number) must return `'unknown'`, never `'none'`. It currently returns `{ registered: false }`, which is indistinguishable from a real answer and is the single most misleading line in this feature's blast radius.

---

## Entity: Code Request Decision

Not stored — the output of a pure function over `(intent, status)`. Full truth table in [contracts/decision-logic.md](contracts/decision-logic.md).

| Intent | Status | Can send? | Outcome |
|---|---|---|---|
| `sign-in` | `active` | ✅ yes | code sent |
| `sign-in` | `banned` | ✅ yes | code sent; refused at verification with a specific message (FR-008) |
| `sign-in` | `none` | ❌ no | "not registered — please sign up" + link (FR-004) |
| `sign-in` | `unknown` | ❌ no | "could not check — please try again" (FR-009) |
| `register` | `active` | ❌ no | "already registered — please sign in" (FR-006) |
| `register` | `banned` | ❌ no | same as `active`: the number is taken (FR-006) |
| `register` | `none` | ✅ yes | code sent; registration proceeds |
| `register` | `unknown` | ❌ no | "could not check — please try again" (FR-009) |

Two rules follow directly and are worth stating because they are the whole bug:

- **`sign-in` + registered → send.** A registered number is the expected case on the sign-in page, not a problem.
- **`register` + registered → refuse.** A registered number is a problem on the sign-up page.

The previous code applied the *register* row to both pages, which is why sign-in refused registered numbers, and then added its own refusal for the `none` case, which is why sign-in also refused unregistered ones. Together: everything refused.

---

## Entity: Intended Destination

Not stored in this schema — carried through the page as a query parameter (`callbackUrl`), already implemented in both auth pages.

Requirements touching it:

- FR-005 — when sign-in refuses an unregistered number, the link to sign-up carries the number so the shopper does not retype it.
- Sign-in already honours `callbackUrl` on success (`router.push(callbackUrl)`). Unchanged.

---

## Invariants

> **The decision depends only on the intent and the current status, both supplied at the moment of the request.** No verdict is cached, carried across requests, or inferred from a previous page (research.md R5, FR-010).

> **Refusing to send a code changes nothing.** No row is written, no account created or altered by a refusal (FR-014). The only side effect of the whole flow is the `VerificationToken` row created on a successful send — the same row 007 already manages.

> **No stored entity represents this feature.** There is no "pending registration" or "unconfirmed account" state; the only new thing is a wider return type from an action that already existed.

---

## Data Volume

Unchanged from 007. The lookup hits `User` on a unique-indexed `mobile`. The decision adds no storage, no new table, no new column, and no additional query.
