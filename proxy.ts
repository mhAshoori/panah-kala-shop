import { NextResponse, type NextRequest } from 'next/server';

// The next-intl middleware is intentionally not used: the app has a single
// set of unprefixed routes and the language is resolved server-side from
// the DB (admin-controlled). This proxy only assigns session cart ids.
export default function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Ensure every visitor has a session cart id so server actions can
  // associate carts with the current visitor (anonymous or signed in).
  if (!request.headers.get('cookie')?.includes('sessionCartId')) {
    response.cookies.set('sessionCartId', crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. favicon.ico)
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
