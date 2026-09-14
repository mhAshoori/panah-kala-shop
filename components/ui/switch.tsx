'use client';

import * as React from 'react';
import { Switch as RadixSwitch } from 'radix-ui';

import { cn } from '@/lib/utils';

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof RadixSwitch.Root>) {
  return (
    <RadixSwitch.Root
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        className
      )}
      {...props}
    >
      <RadixSwitch.Thumb
        className='block h-4 w-4 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 rtl:-translate-x-4 rtl:data-[state=checked]:-translate-x-4 rtl:data-[state=unchecked]:translate-x-0'
        dir='rtl'
      />
    </RadixSwitch.Root>
  );
}

export { Switch };
