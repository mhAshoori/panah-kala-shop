# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 (App Router), React 19

**Primary Dependencies**: `sonner` (toasts — already installed and mounted app-wide in `app/layout.tsx:132` via `AppToaster`), `next-auth@5.0.0-beta.32`, `next-intl`, Jest 30

**Storage**: PostgreSQL via Prisma 7. No schema change.

**Testing**: Jest 30, `testEnvironment: 'node'`, `__tests__/**/*.test.ts`. The decision function is pure and gets direct unit coverage — this is the class of bug that slipped through in 007 because nothing tested the *decision*, only the sending.

**Target Platform**: Linux VPS behind Nginx + CDN, `next start` on Node 22

**Project Type**: Single Next.js web app

**Performance Goals**: The registration lookup is already throttled (10 per 10 minutes per number). No new round-trips: the intent decision is local, made client-side from a value already fetched.

**Constraints**:
- `checkPhoneRegistered` returns `{ registered: boolean }` only. It cannot distinguish "no account" from "banned account" or "lookup failed" — the throttle returns `{ registered: false }` when blocked, which is indistinguishable from genuinely unregistered. FR-008 and FR-009 both need more than this boolean.
- Sign-in navigates immediately on success (`router.push(callbackUrl)` at lines 96 and 144). A toast fired in the same tick as navigation is destroyed by the unmount — the success toast must be raised after the navigation settles, or not at all.
- Sign-up is server-redirected (`redirect('/user/profile')` inside the server action), so a client-side success toast cannot fire there at all without moving the redirect.
- RTL: Persian-first; toast positioning is already handled by `AppToaster rtl={...}`.

**Scale/Scope**: Single shared component, two call sites, two forms, one pure function. No migration, no new dependency.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
