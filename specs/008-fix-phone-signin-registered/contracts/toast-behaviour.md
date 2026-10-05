# Contract: Toast Behaviour for Sign-In and Sign-Up

User-requested feedback for authentication outcomes. `sonner` is already installed and `AppToaster` is already mounted app-wide in `app/layout.tsx:132`, so this adds no wiring.

RTL note: Persian-first storefront. `AppToaster` already receives `rtl={locale === 'fa'}`, so positioning follows the locale. Directional icons in new toasts need `rtl:-scale-x-100`.

---

## Why success is asymmetric

The two forms navigate by different mechanisms, and this is forced by the code (research.md R4) — not a preference:

| Form | Navigation | Can a client toast fire on success? |
|---|---|---|
| Sign-in | `router.push(callbackUrl)` after `verifySession()` confirms a session | ✅ yes — after navigation settles |
| Sign-up | `redirect('/user/profile')` **on the server**; the client never gets control back | ❌ no |

For sign-up, the shopper arrives on their profile page signed in. That is stronger confirmation than any message, and a toast saying "signed up successfully" on top of it is redundant. Moving the sign-up redirect to the client purely to raise a toast would trade a server-guaranteed navigation for a client-side one — weakening exactly what 007's FR-023 established, for a cosmetic gain.

---

## Success toasts

| Form | Toast | When | Detail |
|---|---|---|---|
| **Sign-in** | ✅ success | Session verified **and** navigation has settled | Sign-in welcome message |
| **Sign-up** | — none | — | The destination page (profile, signed in) is the confirmation |

### The timing rule that matters

Sign-in navigates immediately on success (`router.push(callbackUrl)` at lines 96 and 144). A toast raised in the same tick **is unmounted with the form and never seen** — this is the default failure mode and must be avoided explicitly.

```ts
// WRONG — unmounted before it renders
toast.success(msg);
router.push(callbackUrl);

// RIGHT — raised once the destination is mounted
router.push(callbackUrl);
toast.success(msg, { id: 'auth' });
```

The toast must survive navigation because `AppToaster` is mounted in `app/layout.tsx`, outside the auth pages, so it outlives the form. Verified in browser by inspecting the **destination** page, not the sign-in page.

---

## Failure toasts

Shown **in addition to** the existing inline error, never instead of it (research.md R3).

| Condition | Message key | Severity |
|---|---|---|
| Code wrong or expired | `invalidOtp` | error |
| Code expired specifically | `otpExpired` | error |
| Number unregistered (sign-in) | `phoneNotRegistered` | error |
| Number already registered (sign-up) | `phoneAlreadyRegistered` | error |
| Lookup failed or throttled | `phoneCheckFailed` | error |
| Too many attempts | `tooManyAttempts` | error |
| Account banned | `accountBanned` | error |
| Code could not be sent | `smsSendFailed` | error |

### Why keep the inline error

Inline errors are form-associated, persistent, and announced to assistive technology. A toast is transient. Removing inline errors to replace them with toasts would be a regression — accessibility basics are not to be simplified away.

### What is not toasted

Field-level validation (e.g. "number must be 10 digits") stays inline next to the field. A toast per keystroke-triggered validation is noise.

---

## Rate limiting of toasts

One toast per outcome, not one per render. Guarded with a ref so a re-render cannot stack duplicates, following the pattern already used for `accountCreatedNotSignedIn` in `signup-form.tsx`. Reset the guard when the state clears, so a second genuine failure later still toasts.

---

## Existing fallback toast preserved

`accountCreatedNotSignedIn` (007) — the rare case where a sign-up created the account but could not establish the session — continues to fire as an error toast with a sign-in action. Untouched by this feature.

---

## Accessibility

- The toast region is already `aria-live` via `AppToaster`; do not add a second live region.
- Failure toasts use error severity so they are announced as such, not silently.
- Success toast on sign-in is `polite`, not assertive — it confirms something the shopper already knows from the destination page.
- Every message key exists in **both** `messages/fa.json` and `messages/en.json` (constitution IV). The parity test enforces it.

## Message keys introduced

| Key | Purpose |
|---|---|
| `signedInSuccess` | Sign-in completed |
| `signedUpSuccess` | Reserved; sign-up confirms via destination. Included so the copy exists if the redirect ever moves client-side |
| `phoneCheckFailed` | The registration lookup failed or was throttled |
| `accountBanned` | Account exists but is suspended |
| `smsSendFailed` | The code could not be sent |

Persian is the default locale. Natural Persian, not transliterated English.

---

## Verification

Success toasts cannot be checked on the auth page — by construction they appear on the destination. quickstart.md has a dedicated scenario that navigates and then inspects the page the shopper lands on.
