import { NextRequest, NextResponse } from 'next/server';

import { verifyZarinpalPayment } from '@/lib/actions/payment.actions';

// ZarinPal redirects the user's browser back here after the gateway flow.
// Query params: Authority, Status (OK|NOK), orderId
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const orderId = searchParams.get('orderId') ?? '';
  const authority = searchParams.get('Authority') ?? '';
  const status = searchParams.get('Status') ?? 'NOK';

  const result = await verifyZarinpalPayment({
    orderId,
    authority,
    status,
  });

  // Build a clean redirect URL (avoid duplicating query params)
  const path = result.redirectTo.split('?')[0];
  const query =
    result.success === true
      ? `paid=success&refId=${encodeURIComponent(String(result.refId ?? ''))}`
      : 'paid=failed';

  return NextResponse.redirect(new URL(`${path}?${query}`, req.url));
}
