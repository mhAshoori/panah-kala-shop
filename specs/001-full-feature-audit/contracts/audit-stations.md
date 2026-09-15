# Audit Stations Contract (001-full-feature-audit)

Each station executed in order in a live browser session. For every station:
- Result: PASS | FAIL(C1) | FAIL(C2) | FAIL(C3)
- Defect rows added to `specs/001-full-feature-audit/audit-notes.md`:
  `{station, route, steps, expected, actual, severity, fixCommit?, reverified?}`
- Severity: C1 = blocks golden path or corrupts/loses data; C2 = feature broken on some path; C3 = cosmetic/minor.
- C1/C2 must be fixed + re-verified (set `reverified: true`) before audit closes.

| Station | Route(s) | Geared outcome |
|---|---|---|
| S1 Home | `/` | Blocks render; header/menus navigate |
| S2 Catalog | `/category/*`, `/search` | Products list, sorting/filter |
| S3 Product | `/product/*` | Images 200, variants deep-link, stock/price |
| S4 Auth | `/sign-in`, `/sign-up` | Email+OTP flows, banned negative |
| S5 Cart | Cart page/components | Guest add, merge on sign-in, coupon errors |
| S6 Pay | `/shipping-address`, payment | ZarinPal PAID, COD done, abandoned, coupon-at-purchase |
| S7 Orders | `/user/orders` | History + detail + trackCode |
| S8 UGC | product page sections | Review (+approve gate), Q&A, favourite |
| S9 Profile | `/user/profile` | Info edits, addresses, avatar upload+reject |
| S10 Support | chat widget | Round-trip badges, unread counts |
| S11 AI | chat widget | Grounded answer + link, 429 rate limit |
| S12 Admin | `/admin/*` | Every sidebar section CRUD + badges |
| S13 Gate | CLI | tsc, lint, test ≥286, build; fa/en parity × themes; image sweep |

Fixture accounts: `admin@example.com`/`12345678`, `jane@example.com`/`123456`.
Sandbox limits mocked-out-of-band: real SMS, real ZarinPal merchant, Google OAuth.
