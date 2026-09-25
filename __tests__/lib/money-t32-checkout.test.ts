import { calcPrice } from '@/lib/cart/pricing';
import { couponDiscount } from '@/lib/coupon';

// T032 Scenario 8: write a real order row through the real pricing path and
// verify the stored record balances as whole Toman. Uses the dev database, so
// it cleans up after itself and is skipped without DATABASE_URL.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

describeDb('quickstart Scenario 8 — a real checkout records exact whole Toman', () => {
  let c: import('pg').Client;
  let orderId: string | null = null;

  beforeAll(async () => {
    // pg is ESM-only, so it cannot be a top-level import in a Jest module.
    const { Client } = await import('pg');
    c = new Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
  });

  afterAll(async () => {
    if (orderId) await c.query('DELETE FROM "Order" WHERE id=$1', [orderId]);
    await c.end();
  });

  it('stores balanced integer totals, then removes the row', async () => {
    const user = await c.query('SELECT id FROM "User" LIMIT 1');
    const product = await c.query(
      `SELECT p.id, p.slug, p.name, p."images"[1] img, p.price, v.id vid
         FROM "Product" p JOIN "ProductVariant" v ON v."productId" = p.id
        WHERE v.stock > 3 LIMIT 1`
    );
    const u = user.rows[0];
    const p = product.rows[0];

    const items = [
      { price: p.price, qty: 2 },
      { price: 49000, qty: 1 },
    ];
    const gross = items.reduce((a, i) => a + i.price * i.qty, 0);
    const disc = couponDiscount('percent', 15, gross);
    const totals = await calcPrice(items, disc);

    const inserted = await c.query(
      `INSERT INTO "Order"
         ("userId","shippingAddress","paymentMethod","itemsPrice","shippingPrice","taxPrice","totalPrice","couponCode","couponDiscount","updatedAt")
       VALUES ($1,'{}','COD',$2,$3,$4,$5,'T32-VERIFY',$6,now())
       RETURNING id`,
      [
        u.id,
        totals.itemsPrice,
        totals.shippingPrice,
        totals.taxPrice,
        totals.totalPrice,
        disc,
      ]
    );
    orderId = inserted.rows[0].id;

    await c.query(
      `INSERT INTO "OrderItem" ("orderId","productId","variantId","qty","price","name","slug","image")
       VALUES ($1,$2,$3,2,$4,$5,$6,$7)`,
      [orderId, p.id, p.vid, p.price, p.name, p.slug, p.img]
    );

    const r = (
      await c.query(
        `SELECT "totalPrice","itemsPrice","shippingPrice","taxPrice","couponDiscount"
           FROM "Order" WHERE id=$1`,
        [orderId]
      )
    ).rows[0];

    // SC-004: totals balance with no residual. itemsPrice is already NET of
    // the discount (calcPrice subtracts it before tax), so it must NOT be
    // subtracted again here.
    expect(r.itemsPrice + r.shippingPrice + r.taxPrice).toBe(r.totalPrice);
    // And the discount is consistent with the gross it came from.
    expect(r.itemsPrice).toBe(gross - r.couponDiscount);
    // FR-001: nothing fractional survives to the database.
    expect(
      [r.totalPrice, r.itemsPrice, r.shippingPrice, r.taxPrice, r.couponDiscount].every(
        Number.isInteger
      )
    ).toBe(true);
    // The coupon was applied as a whole-Toman discount.
    expect(r.couponDiscount).toBe(disc);
  });
});
