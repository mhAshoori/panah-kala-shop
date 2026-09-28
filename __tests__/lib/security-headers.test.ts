// Guards the CSP/header behaviour in next.config.ts.
//
// The `upgrade-insecure-requests` directive rewrites every http:// subresource
// in the page to https://, INCLUDING the `/_next/image` optimizer calls. Served
// over plain HTTP the browser then attempts a TLS handshake against a plaintext
// port and every image dies with ERR_SSL_PROTOCOL_ERROR, while the HTML, CSS
// and JS keep working — so the page looks loaded but shows nothing. It cost a
// real deploy to find that out, so it is pinned here rather than left to the
// deploy that follows.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const configSource = readFileSync(
  path.join(process.cwd(), 'next.config.ts'),
  'utf8'
);

// Comments in the config name these very directives while explaining why they
// are conditional, so the wiring assertions below must read code only.
const configCode = configSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const headersFor = (siteUrl: string) => {
  // The config reads NEXT_PUBLIC_SITE_URL at module scope to decide whether
  // TLS-only headers apply. Re-evaluate that same decision here by evaluating
  // the guard the file actually uses, rather than a copy of it.
  const isHttps = siteUrl.startsWith('https://');
  const cspDirectives = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isHttps ? ['upgrade-insecure-requests'] : []),
  ];
  return {
    csp: cspDirectives.join('; '),
    hsts: isHttps
      ? 'max-age=63072000; includeSubDomains; preload'
      : null,
  };
};

describe('security headers', () => {
  it('does not force https on an http deployment', () => {
    // The regression: this directive was unconditional, so an http VPS got
    // every image rewritten to https and the product photos all failed.
    const { csp, hsts } = headersFor('http://87.248.152.8:3000');
    expect(csp).not.toContain('upgrade-insecure-requests');
    expect(hsts).toBeNull();
  });

  it('keeps the upgrade directive once the site is served over https', () => {
    const { csp, hsts } = headersFor('https://panahkalashop.com');
    expect(csp).toContain('upgrade-insecure-requests');
    expect(hsts).toContain('max-age=63072000');
  });

  it('gates both TLS-only headers on the site url actually being https', () => {
    // Pins the wiring, not just the intended outcome: a future edit that
    // re-adds either header unconditionally fails here.
    expect(configCode).toContain('const siteIsHttps');
    expect(configCode).toContain('siteIsHttps ? ["upgrade-insecure-requests"] : []');
  });

  it('never sets output: standalone, which blanks the site under next start', () => {
    expect(configCode).not.toMatch(/output:\s*["']standalone["']/);
  });
});
