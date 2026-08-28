import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';
import SignUpForm from './signup-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('signUp') };
}

const SignUpPage = async (props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) => {
  const searchParams = await props.searchParams;

  const cb = searchParams.callbackUrl || '/';

  const session = await auth();
  if (session) redirect(cb);

  const t = await getTranslations('auth');

  return (
    <div className='w-full max-w-md mx-auto'>
      <Card>
        <CardHeader className='space-y-4'>
          <Link href='/' className='flex-center'>
            <Image
              priority={true}
              src='/images/logo.svg'
              width={100}
              height={100}
              alt={`${APP_NAME} logo`}
            />
          </Link>
          <CardTitle className='text-center'>{t('createAccount')}</CardTitle>
          <CardDescription className='text-center'>
            {t('signUpSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <SignUpForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpPage;
