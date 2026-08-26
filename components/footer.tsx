'use client';

import { useTranslations } from 'next-intl';

const Footer = () => {
  const t = useTranslations('footer');

  return (
    <footer className="border-t">
      <div className="p-5 flex-center text-sm text-muted-foreground">
        {t('copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
};

export default Footer;
