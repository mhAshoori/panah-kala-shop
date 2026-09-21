# Data Model: Admin Notification Log

## Notification (EXISTING — extended usage, no schema change)
| Field | Type | Notes |
|---|---|---|
| id | Uuid | default gen_random_uuid() |
| type | String | 'order' \| 'payment' \| 'signup' \| 'question' \| 'stock' |
| title | String | short label; source of the kind tag shown in UI |
| body | String | human-readable detail — MUST carry the entity: buyer+total for order; product name for stock; user name for signup/question |
| data | Json? | { orderId?, productId?, userId?, total?, productName? } — drives href |
| isRead | Boolean | default false; kept for the nav badge |
| createdAt | Timestamp | indexed via @@index([isRead, createdAt]) |

**No new columns, no migration needed.**

## href mapping (per kind)
- order / payment → /admin/orders
- signup → /admin/users
- question → /admin/support
- stock → /admin/products

## Setting (EXISTING)
- new row key `notificationsPageSize` (value "10".."100"), admin-adjustable at the notifications page, zod-clamped; default 12 when absent.
