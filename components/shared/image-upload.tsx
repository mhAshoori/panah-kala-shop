'use client';

// Single-image upload button: picks a file, uploads to /api/upload, and
// reports the stored URL back. Used by admin forms and the profile avatar.

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { uploadFile } from '@/lib/upload';
import { cn } from '@/lib/utils';

const ImageUploadButton = ({
  folder,
  onUploaded,
  label,
  className,
}: {
  folder: 'products' | 'avatars' | 'content';
  onUploaded: (url: string) => void;
  label?: string;
  className?: string;
}) => {
  const t = useTranslations('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    const res = await uploadFile(file, folder);
    setBusy(false);
    if (res.url) {
      onUploaded(res.url);
    } else {
      toast.error(t(res.messageKey ?? 'uploadFailed'));
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type='file'
        accept='image/jpeg,image/png,image/webp,image/avif,image/gif'
        className='hidden'
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={busy}
        className={cn('gap-2', className)}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className='h-4 w-4 animate-spin' />
        ) : (
          <ImagePlus className='h-4 w-4' />
        )}
        {label ?? t('upload')}
      </Button>
    </>
  );
};

export default ImageUploadButton;
