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
import ForgotPasswordForm from './forgot-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('forgotPassword') };
}

const ForgotPasswordPage = async () => {
  const t = await getTranslations('auth');

  return (
    <div className='w-full max-w-md mx-auto'>
      <Card>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-center'>{t('forgotPassword')}</CardTitle>
          <CardDescription className='text-center'>
            {t('forgotPasswordHint')}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <ForgotPasswordForm />
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

export default ForgotPasswordPage;
