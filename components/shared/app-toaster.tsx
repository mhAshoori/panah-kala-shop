'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

/**
 * Responsive toaster: toasts pop at the top-center on small screens and at
 * the top corner on larger screens.
 */
const AppToaster = ({ rtl }: { rtl: boolean }) => {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsSmall(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <Toaster
      richColors
      closeButton
      position={isSmall ? 'top-center' : rtl ? 'top-left' : 'top-right'}
    />
  );
};

export default AppToaster;
