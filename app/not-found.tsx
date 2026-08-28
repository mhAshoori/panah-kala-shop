import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { APP_NAME } from '@/lib/constants';

const NotFound = () => {
  const t = useTranslations('common');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Image
        priority={true}
        src="/images/logo.svg"
        width={48}
        height={48}
        alt={`${APP_NAME} logo`}
      />
      <div className="p-6 rounded-lg shadow-md w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold mb-4">404</h1>
        <p className="text-destructive">{t('notFound')}</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/">{t('back')}</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
