import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ResetPasswordForm from './reset-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('resetPassword') };
}

const ResetPasswordPage = async (props: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) => {
  const { token, email } = await props.searchParams;
  const t = await getTranslations('auth');

  return (
    <div className='w-full max-w-md mx-auto'>
      <Card>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-center'>{t('resetPassword')}</CardTitle>
          <CardDescription className='text-center'>
            {t('resetPasswordHint')}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {token && email ? (
            <ResetPasswordForm token={token} email={email} />
          ) : (
            <p className='text-center text-sm text-destructive'>
              {t('resetLinkInvalid')}
            </p>
          )}
          <p className='text-center text-sm text-muted-foreground'>
            <Link href='/sign-in' className='hover:text-primary transition-colors'>
              {t('backToSignIn')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
