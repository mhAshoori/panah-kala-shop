# Feature Specification: Admin Notification Log

**Feature Branch**: `003-admin-notification-log`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: dedicated admin section at /admin/notifications logging all activity notifications (orders, payments, signups, user questions, low/sold-out stock). Every entry visually tagged with its source (e.g. a user message, a sold-out product alert). Sold-out toasts currently omit the product — toast copy must be complete and self-explanatory. No server overload from any of these changes.

## Clarifications

### Session 2026-09-21

- Q: How long should the notification log keep its records? → A: Cap the log at 5,000 records; when exceeded, the oldest records are auto-deleted (rolling cap).
- Q: How are items paginated on /admin/notifications? → A: Page size is admin-adjustable at runtime (saved with the store settings); list is field-less page navigation bounded by the chosen page size.
## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse full notification log (Priority: P1)

A store admin opens /admin/notifications and sees a chronological list (newest first) of every activity notification recorded — new orders, payments, user signups, user support questions, and stock alerts. Each entry carries a visible tag identifying its kind so the admin can tell at a glance where it came from.

**Why this priority**: Core ask — a persistent browsable history instead of transient toasts that disappear.

**Independent Test**: Trigger an order, a question and a stock drop; open /admin/notifications; verify each appears with correct kind tag, detail and timestamp.

**Acceptance Scenarios**:

1. **Given** a new order was placed, **When** the admin opens /admin/notifications, **Then** an "order" entry appears with timestamp and identifying detail (order id or total).
2. **Given** a user sent a support question, **When** the admin opens /admin/notifications, **Then** a "user question" entry appears, tagged appropriately.
3. **Given** a product reached the alert threshold (sold out or low), **When** the admin opens /admin/notifications, **Then** a "stock alert" entry appears naming that product.
4. **Given** no events exist, **When** the admin opens the page, **Then** a helpful empty-state message shows (not a blank or broken page).

### User Story 2 - Complete, self-explanatory toast copy (Priority: P1)

Toast messages must be complete and actionable on their own: stock-alert toasts name the affected product, order toasts identify the order, question toasts identify the user. No toast is left missing its key entity.

**Why this priority**: The current sold-out toast omits the product name — incomplete toasts defeat the purpose.

**Independent Test**: Fire each toast kind and confirm the specific entity is included in the copy.

**Acceptance Scenarios**:

1. **Given** a product reached 0 or low stock, **When** its toast fires, **Then** the toast includes the product name.
2. **Given** an order was placed, **When** the toast fires, **Then** the toast identifies the order (id or total).

### User Story 3 - Server-safe delivery (Priority: P2)

Notification recording and any auto-refresh must not overload the server: modest poll cadence (tens of seconds), bounded DB reads, and no design that writes or reads per navigation.

**Why this priority**: A recent bug flooded the server at ~4 requests/sec; user explicitly requires no repeat.

**Independent Test**: Watch server logs while an admin browses >=2 min; notification-system requests total <= 10.

**Acceptance Scenarios**:

1. **Given** an admin browsing one admin page, **When** 2 minutes pass, **Then** notification-system requests total <= 10.
2. **Given** the notifications page is open then navigated away, **When** the admin leaves, **Then** background polling for that page stops.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a /admin/notifications page accessible only to signed-in admins.
- **FR-002**: The page MUST display every recorded notification newest-first.
- **FR-003**: Each entry MUST carry a visible tag indicating its kind: order, payment, signup, user question, or stock alert.
- **FR-004**: Each entry MUST show a human-readable description with enough context to identify the entity (product name for stock alerts, order id/total for orders, the user for questions).
- **FR-005**: Each entry MUST show when it occurred (date and time, locale-aware).
- **FR-006**: Each entry SHOULD link to its relevant admin page (orders / users / support / products).
- **FR-007**: Notification events MUST be recorded when they occur so the log is complete retrospectively, not reconstructed from transient state.
- **FR-010**: The log MUST be capped at 5,000 records; when the cap is exceeded, the oldest records are automatically deleted (rolling cap).
- **FR-011**: The admin MUST be able to adjust how many notifications the log page shows per page (page size), persisted as an admin setting; smallest safe value ~10, largest ~100.
- **FR-008**: Stock-alert toasts MUST include the affected product name; order toasts MUST identify the order.
- **FR-009**: Background refresh MUST be lighforndefer expensive reads (bounded row limits, modest cadence in the tens of seconds) and MUST NOT fire per navigation.

### Key Entities

- **NotificationEvent**: one recorded activity — kind (order/payment/signup/question/stock), reference to the source entity, human-readable detail (product name, order id/total, user name), timestamp, and creation time as logged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All supported event kinds render on /admin/notifications with correct tags and detail within 5 s of triggering each event.
- **SC-002**: A stock-alert toast visibly contains the product name.
- **SC-003**: Notification-system traffic while an admin browses one page stays <= 1 request per 30 s.
- **SC-004**: The most recent 50 notifications render without noticeable lag and without missing rows.
- **SC-005**: Admin changes page size → next render of /admin/notifications shows exactly that many entries; the choice persists after page reload.

## Assumptions

- Single-admin store; volume is low; simple DB-backed storage suffices.
- Toast UI already exists (sonner); this feature extends toasting + adds the log page.
- Existing polling patterns will be reused, not reinvented.
- Retention: rolling cap of 5,000 records — oldest pruned automatically once exceeded.
