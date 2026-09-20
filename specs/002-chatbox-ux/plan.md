# Implementation Plan: Storefront Chat Box UX & Admin Notifications

**Branch**: `002-chatbox-ux` | **Date**: 2026-09-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-chatbox-ux/spec.md`

## Summary

Fix the storefront/admin chat panel positioning (inset from viewport edge on ≥640 px; top-center + dimmed backdrop on phones), suppress auto keyboard pop-up on mobile open, add background auto-refresh so shopper↔admin support messages appear within ~10 s without reload, and add polled admin toast notifications (orders, payments, signups, questions, low stock) with referral links. Panels already self-poll storefront-side (10 s interval exists); the admin support inbox is the static side that needs polling. No DB schema changes required.

## Technical Context

**Language/Version**: TypeScript / Next.js 16 (App Router, server actions, proxy.ts convention)
**Primary Dependencies**: React 19, next-intl, Tailwind v4, sonner (toasts, already installed), Prisma 7 (existing schema — no changes), lucide-react
**Storage**: Existing PostgreSQL (support threads + orders rows already persisted; no migration)
**Testing**: Jest 30 (`__tests__/**/*.test.ts`, node env) + browser preview verification
**Target Platform**: Vercel/VPS web; verified at mobile (375 px) and desktop breakpoints
**Project Type**: Web application (Next.js storefront + admin panel, single codebase)
**Performance Goals**: Poll cadence 10 s while panel open; toast poll ≤ 30 s while an admin session is active
**Constraints**: RTL/fa-first (logical properties only); no regressions to z-index layering; validation gate must pass
**Scale/Scope**: 3 component files + 1–2 lib/ai or lib/actions additions + i18n keys in fa/en

## Constitution Check

*Re-checked against `.specify/memory/constitution.md` (v1.0.0).*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Iranian ecommerce first (both roles end-to-end) | PASS | Fix touches both storefront widget and admin inbox; no dead ends introduced |
| II. Money & data integrity | PASS | No money/logic changes |
| III. Security by default | PASS | New poll endpoints/actions reuse existing authz (`requireAdmin()` / `getValidUserId()`); toasts fire from existing read-only actions with admin guard |
| IV. Bilingual completeness | PASS | All new strings in `messages/fa.json` + `messages/en.json` (parity test green) |
| V. Test & E2E verification | PASS | Jest additions for pure logic (event-diffing helper); browser verification at mobile/desktop breakpoints before done |
| VI. Data layer discipline | PASS | No migrations |
| VII. Efficiency & simplicity | PASS | Reuses existing sonner toasts, existing fetchMySupportThread polling pattern, existing mobile-menu-sheet backdrop pattern |

## Project Structure

### Documentation (this feature)

```text
specs/002-chatbox-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist (all passing)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
components/shared/assistant/
├── chat-widget.tsx        # Storefront: positioning, backdrop, keyboard, existing 10s support poll
├── admin-chat.tsx         # Admin AI chat: same positioning/backdrop/keyboard fixes
└── message-content.tsx    # untouched

app/admin/support/
├── admin-support-client.tsx  # Add 10s thread poll (currently static server-rendered)

components/shared/admin/
├── admin-notifications.tsx   # NEW: client poller → sonner toasts with referral links

lib/
├── actions/support.actions.ts      # already exposes fetchMySupportThread / admin variants
└── actions/notify.actions.ts (or server action in admin layout data path)
    # adminActivity* action(s): requireAdmin() + read-only counts-since-timestamp
    # for orders / payments / signups / unread support / low stock

messages/
├── fa.json, en.json          # new assistant/notification keys (both files)
```

**Structure Decision**: No new top-level tree — everything extends the existing single-codebase structure. One new client component (`admin-notifications.tsx`) mounted in `app/admin/layout.tsx`, one new server action module for admin activity polling, and edits to the three existing chat/panel client components. Contracts: none (no external API surface changes; internal server actions only).

## Complexity Tracking

> No constitution violations — table empty.
