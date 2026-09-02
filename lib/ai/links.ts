// Client-safe parser for assistant markdown links. Must not import anything
// that pulls the DB into the bundle (see sanitize.ts header).
//
// Safety contract: only links that resolve to THIS store become clickable —
// relative paths ("/product/x", "/search?q=…") and same-origin absolute URLs.
// Anything else (other domains, protocol-relative "//evil.com", javascript:)
// degrades to plain text, so the assistant can never hand out an outer link.

export type AssistantSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string };

/** [label](url) — label may be empty-ish, url may not contain spaces/parens. */
const MD_LINK_RE = /\[([^\]\n]*)\]\(([^()\s]+)\)/g;

/** True when href points at this deployment (safe to render as a link). */
export function isSafeInternalHref(href: string, origin?: string): boolean {
  if (!href) return false;
  if (href.startsWith('/')) return !href.startsWith('//');
  if (!/^https?:\/\//i.test(href) || !origin) return false;
  try {
    return new URL(href).origin === new URL(origin).origin;
  } catch {
    return false;
  }
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
