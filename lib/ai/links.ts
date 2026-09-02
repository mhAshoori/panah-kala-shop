// Client-safe parser for assistant markdown links. Must not import anything
// that pulls the DB into the bundle (see sanitize.ts header).
//
// Safety contract, two layers:
//   1. ORIGIN — only links that resolve to THIS store become clickable:
//      relative paths ("/product/x", "/search?q=…") and same-origin absolute
//      URLs. Anything else (other domains, "//evil.com", javascript:)
//      degrades to plain text, so the assistant can never hand out an outer
//      link.
//   2. ROUTE — the path must match a real route pattern of this app. The
//      model can hallucinate "/product/does-not-exist" or "/prodct/x"; those
//      would land on the 404 page. Matching against the known route list
//      (static prefixes + strict dynamic-segment shapes) downgrades such
//      links to plain text before they ever render.

export type AssistantSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string };

/** [label](url) — label may be empty-ish, url may not contain spaces/parens. */
const MD_LINK_RE = /\[([^\]\n]*)\]\(([^()\s]+)\)/g;

/**
 * Known app routes. Static entries are exact prefixes; dynamic entries are
 * regexes for the full remaining path. Everything below exists in app/ —
 * keep in sync when routes are added/removed.
 */
const STATIC_ROUTES = [
  '/',
  '/cart',
  '/contact-us',
  '/sign-in',
  '/sign-up',
  '/shipping-address',
  '/payment-method',
  '/place-order',
  '/favorites',
  '/user',
  '/user/profile',
  '/user/orders',
  '/user/addresses',
  '/user/favorites',
  '/admin',
  '/admin/orders',
  '/admin/products',
  '/admin/products/create',
  '/admin/categories',
  '/admin/categories/create',
  '/admin/coupons',
  '/admin/users',
  '/admin/marketing',
  '/admin/homepage',
  '/admin/settings',
];

const DYNAMIC_ROUTES: { re: RegExp; prefix: string }[] = [
  { re: /^\/product\/[a-z0-9-]{1,120}$/, prefix: '/product/' },
  { re: /^\/category\/[a-z0-9-]{1,120}$/, prefix: '/category/' },
  { re: /^\/order\/[0-9a-fA-F-]{1,40}$/, prefix: '/order/' },
  { re: /^\/admin\/orders\/[0-9a-fA-F-]{1,40}$/, prefix: '/admin/orders/' },
  { re: /^\/admin\/products\/[0-9a-fA-F-]{1,40}$/, prefix: '/admin/products/' },
  { re: /^\/admin\/categories\/[0-9a-fA-F-]{1,40}$/, prefix: '/admin/categories/' },
  { re: /^\/admin\/users\/[0-9a-fA-F-]{1,40}$/, prefix: '/admin/users/' },
  { re: /^\/search$/, prefix: '/search' }, // query string checked separately
];

/**
 * True when the PATH portion of href matches a real route of this app.
 * Query strings are allowed only on routes that use them (/search).
 */
export function isKnownRoute(pathname: string): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/\/+$/, '') || '/';
  if (STATIC_ROUTES.includes(path)) return true;
  if (path.startsWith('/search')) {
    // /search + any query is a real route; deeper paths are not
    return /^\/search(\?.*)?$/.test(path) || path === '/search';
  }
  return DYNAMIC_ROUTES.some(({ re }) => re.test(path));
}

/** True when href points at this deployment AND a real route. */
export function isSafeInternalHref(href: string, origin?: string): boolean {
  if (!href) return false;
  let path: string;
  if (href.startsWith('/')) {
    if (href.startsWith('//')) return false;
    path = href;
  } else if (/^https?:\/\//i.test(href) && origin) {
    try {
      const url = new URL(href);
      if (url.origin !== new URL(origin).origin) return false;
      path = url.pathname + url.search;
    } catch {
      return false;
    }
  } else {
    return false;
  }

  // Split off the query string: route matching works on the path, and only
  // /search legitimately carries one.
  const qIndex = path.indexOf('?');
  const pathname = qIndex >= 0 ? path.slice(0, qIndex) : path;
  const search = qIndex >= 0 ? path.slice(qIndex) : '';

  if (search && !pathname.startsWith('/search')) return false;

  return isKnownRoute(pathname);
}

/**
 * Split sanitized assistant text into text/link segments. Unsafe hrefs are
 * downgraded to their label as plain text — the URL never renders.
 */
export function parseAssistantContent(
  text: string,
  origin?: string
): AssistantSegment[] {
  const segments: AssistantSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(MD_LINK_RE)) {
    const [, label, href] = m;
    const start = m.index ?? 0;
    if (start > last) {
      segments.push({ type: 'text', value: text.slice(last, start) });
    }
    if (isSafeInternalHref(href, origin)) {
      segments.push({ type: 'link', label, href });
    } else if (label) {
      segments.push({ type: 'text', value: label });
    }
    last = start + m[0].length;
  }
  if (last < text.length) {
    segments.push({ type: 'text', value: text.slice(last) });
  }
  return segments;
}
