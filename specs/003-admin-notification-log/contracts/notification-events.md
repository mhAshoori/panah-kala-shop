# Contracts: Notification log surfaces

## recordNotification(input) — internal server helper (lib/notifications.ts)
    input: { type, title, body, data? }
    behavior: prisma.notification.create → best-effort prune (>5,000 → one bounded deleteMany of oldest)
    never throws to callers (try/catch inside; logs '[notify] record failed')

## recordNotificationForEvent(kind, payload) — event-site wrapper
    order(order)    → type 'order',    body `${buyer} — ${items} قلم — ${total} تومان`, data {orderId,total}
    payment(order)  → type 'payment',  body `پرداخت سفارش ${orderId} — ${total} تومان`, data {orderId,total}
    signup(user)    → type 'signup',   body `ثبت‌نام کاربر ${name|mobile}`, data {userId}
    question(msg)   → type 'question', body `سوال کاربر ${name} — «${excerpt}»`, data {userId,messageId}
    stock(product,status) → type 'stock', body `${productName} — ${status==='out'?'ناموجود شد':'کمبود موجودی'}`, data {productId,productName}

    (Note: final user-facing copy comes from fa/en message keys with interpolation —
    the strings above are the DB-row source payload, shown post-translation.)

## fetchRecentLog(sinceIso) — replaces the 5-table query in notify.actions.ts
    returns Notification rows where createdAt > sinceIso, take ≤ 20, orderBy createdAt desc,
    mapped to AdminActivityEvent { id, kind, href, createdAtIso, refId } for the existing toast poller.

## getNotifications({ page, limit ≤ 100 }) — existing lister, extended contract
    unchanged URL params (page, size); Setting `notificationsPageSize` becomes the default when `size` is absent.
