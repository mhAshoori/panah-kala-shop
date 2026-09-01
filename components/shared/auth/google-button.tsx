'use client';

// Google OAuth button — rendered on the sign-in and sign-up forms only when
// the server has GOOGLE_CLIENT_ID/SECRET configured. Starts the Auth.js
// OAuth flow; callbackUrl keeps the user on their intended destination.

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

const GoogleButton = ({ callbackUrl = '/' }: { callbackUrl?: string }) => {
  const t = useTranslations('auth');
  const [pending, setPending] = useState(false);

  return (
    <Button
      type='button'
      variant='outline'
      className='w-full'
      disabled={pending}
      onClick={() => {
        setPending(true);
        signIn('google', { callbackUrl });
      }}
    >
      {pending ? (
        <Loader2 className='h-4 w-4 animate-spin' />
      ) : (
        <svg aria-hidden='true' viewBox='0 0 24 24' className='h-4 w-4'>
          <path
            fill='#4285F4'
            d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z'
          />
          <path
            fill='#34A853'
            d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z'
          />
          <path
            fill='#FBBC05'
            d='M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z'
          />
          <path
            fill='#EA4335'
            d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z'
          />
        </svg>
      )}
      {t('googleSignIn')}
    </Button>
  );
};

export default GoogleButton;
