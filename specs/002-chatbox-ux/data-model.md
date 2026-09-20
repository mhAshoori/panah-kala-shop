# Data Model: 002-chatbox-ux

No schema changes. Existing entities consumed read-only:

| Entity | Use | Notes |
|--------|-----|-------|
| `SupportMessage` | Poll shopper↔admin threads (both directions) | Fields used: `userId, body, fromAdmin, isRead, createdAt`. Polls reuse existing `fetchMySupportThread` / admin thread fetch actions |
| `Order` | Admin activity poll (new count since last poll) | `createdAt`, `paymentStatus` (success/failure toasts) |
| `User` | Admin activity poll (new signups) | `createdAt` |
| `Product` | Low-stock alerts | existing stock/columns, read-only |
| `SupportMessage` (unread for admin) | "A user asked a question" toast | `fromAdmin=false, isRead=false` |

**Session state (client-only, not persisted)**: last-poll timestamp + shown event IDs inside `admin-notifications.tsx` component state. Clearing on reload is acceptable (FR-7 is session-scope per spec).
