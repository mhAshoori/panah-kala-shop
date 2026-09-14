import { getTranslations } from 'next-intl/server';

import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import ChatWidget from '@/components/shared/assistant/chat-widget';
import { getValidUserId } from '@/lib/auth-helpers';
import BackToTop from '@/components/shared/back-to-top';
import { getCategoriesWithCount } from '@/lib/actions/product.actions';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [t, userId] = await Promise.all([
    getTranslations('common'),
    getValidUserId(),
  ]);

  return (
    <div className='flex min-h-screen flex-col'>
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground'
      >
        {t('skipToContent')}
      </a>
      <Header />
      <main id='main-content' className='flex-1 wrapper'>
        {children}
      </main>
      <Footer />
      <ChatWidget isAuthed={!!userId} />
      <BackToTop />
    </div>
  );
}
