'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

/**
 * Iranian mobile input: a fixed +98 country-code chip followed by a 10-digit
 * input (9XXXXXXXXX). The parent combines them: `+98` + value.
 */
const PhoneField = ({
  id,
  value,
  onChange,
  required = true,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) => {
  const t = useTranslations('auth');

  return (
    <div
      dir='ltr'
      className={cn(
        'flex h-9 w-full items-center overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        className
      )}
    >
      <span className='flex h-full shrink-0 items-center border-e bg-muted/50 px-2 text-sm text-muted-foreground select-none'>
        +98
      </span>
      <input
        id={id}
        name={id}
        type='tel'
        inputMode='numeric'
        autoComplete='tel-national'
        placeholder='9123456789'
        maxLength={10}
        pattern='\d{10}'
        required={required}
        aria-label={t('mobile')}
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value.replace(/[^\d]/g, '').slice(0, 10))
        }
        className='h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground'
      />
    </div>
  );
};

export default PhoneField;
