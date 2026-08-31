'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

// Admin error boundary — no locale dependency: admin pages must recover
// even if the failure came from next-intl itself.
const AdminError = ({
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
    <div className='flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center'>
      <div className='flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10'>
        <AlertTriangle className='h-8 w-8 text-destructive' />
      </div>
      <div className='space-y-1'>
        <h2 className='h3-bold'>خطا در پنل مدیریت</h2>
        <p className='text-sm text-muted-foreground'>
          مشکلی در اجرای این بخش پیش آمد. دوباره تلاش کنید.
        </p>
      </div>
      <Button onClick={reset} variant='outline'>
        <RotateCcw className='h-4 w-4' />
        تلاش مجدد
      </Button>
    </div>
  );
};

export default AdminError;
