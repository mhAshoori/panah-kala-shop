'use client';

import { useEffect } from 'react';

// Root-level error boundary — must render its own <html>/<body>.
// i18n is unavailable here, so copy is bilingual.
const GlobalError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang='fa' dir='rtl'>
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          خطایی رخ داد · Something went wrong
        </h1>
        <p style={{ color: '#6b7280' }}>
          لطفاً دوباره تلاش کنید · Please try again
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            border: '1px solid #d1d5db',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          تلاش مجدد · Retry
        </button>
      </body>
    </html>
  );
};

export default GlobalError;
