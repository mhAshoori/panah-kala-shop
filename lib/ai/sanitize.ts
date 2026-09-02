// Output sanitizer for assistant messages: users see friendly prose only —
// no JSON braces, protocol tokens, HTTP codes, or diagnostic parentheses.
// Raw details stay available in the server log / network tab for debugging.
//
// Client-safe: must not import anything that pulls the DB into the bundle.

/** The model emits tool requests as a single "TOOL_CALL: {json}" line. */
export const TOOL_CALL_RE = /^\s*TOOL_CALL:\s*(\{[\s\S]*\})\s*$/;

/**
 * Remove protocol noise from a streaming-visible assistant text chunk.
 * Applied to every delta before it reaches the transcript.
 *
 * Markdown links `[label](/path)` survive: a `(` directly preceded by `]`
 * opens a link URL instead of a diagnostic paren, so the URL is kept (and
 * stripped later if it points outside the store).
 */
export function sanitizeAssistantChunk(
  chunk: string,
  /** Set when the previous chunk ended inside an unsanitized region */
  state: {
    inBraces: boolean;
    inParens: boolean;
    inLinkUrl?: boolean;
    lastChar?: string;
  }
): string {
  let out = '';
  let last = state.lastChar;
  for (const ch of chunk) {
    if (ch === '{') {
      state.inBraces = true;
    } else if (ch === '}') {
      state.inBraces = false;
    } else if (state.inBraces) {
      // brace content is dropped
    } else if (state.inLinkUrl) {
      if (ch === ')') state.inLinkUrl = false;
      out += ch;
    } else if (state.inParens) {
      if (ch === ')') state.inParens = false;
    } else if (ch === '(') {
      if (last === ']') {
        state.inLinkUrl = true;
        out += ch;
      } else {
        state.inParens = true;
        out = out.replace(/\s+$/, '');
      }
    } else {
      out += ch;
    }
    last = ch;
  }
  state.lastChar = last;
  return out;
}

/** Final-pass cleanup for a complete assistant message. */
export function sanitizeAssistantText(text: string): string {
  let out = text;

  // Whole-message JSON blobs / tool-call remnants. A TOOL_CALL spans exactly
  // "TOOL_CALL: " + one JSON object — match through its closing brace, not
  // end-of-line, so any answer that follows survives.
  out = out.replace(/TOOL_CALL:\s*\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, '');
  out = out.replace(/TOOL_RESULT:\s*\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, '');
  out = out.replace(/\{[^{}]*\}/g, ''); // any leftover JSON object
  // Diagnostic parentheticals — the (?<!\]) lookbehind keeps markdown link
  // URLs intact, e.g. "[خرید](/product/x)" must survive "(code 503)" removal.
  out = out.replace(/(?<!\])\([^()]*\d{3}\)[^()]*$/g, ''); // trailing "(code 503)" etc.
  out = out.replace(/(?<!\])\((?:خطا|error|کد|code|HTTP|status)[^()]*\)/gi, '');

  // Tidy whitespace around removals
  out = out
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([،.!:؛؟])/g, '$1')
    .trim();

  return out;
}

/** Map a provider/status failure to a short friendly Persian message. */
export function friendlyAssistantError(status: number): string {
  if (status === 429) return 'پیام‌های زیادی فرستادید — لطفاً کمی بعد دوباره تلاش کنید';
  if (status === 503) return 'دستیار هوشمند در دسترس نیست — لطفاً بعداً تلاش کنید';
  return 'دستیار هوشمند موقتاً با خطا مواجه شد — لطفاً دوباره تلاش کنید';
}
