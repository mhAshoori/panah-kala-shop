import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import AdminSidebar from '@/components/shared/admin/sidebar';
import AdminMobileMenuSheet from '@/components/shared/admin/mobile-menu-sheet';
import AdminChat from '@/components/shared/assistant/admin-chat';
import SiteLanguageToggle from '@/components/shared/admin/site-language-toggle';
import SiteFontToggle from '@/components/shared/admin/site-font-toggle';
import SiteThemeToggle from '@/components/shared/admin/site-theme-toggle';
import { auth } from '@/auth';
import { getSiteFont, getSiteTheme } from '@/lib/site-settings';
import { APP_NAME } from '@/lib/constants';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: `${t('dashboard')} | ${APP_NAME}` };
}

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  // Route guard: only admins may enter /admin
  const session = await auth();
  if (!session) redirect('/sign-in');
  if (session.user?.role !== 'admin') redirect('/user/orders');

  const t = await getTranslations('admin');
  const [font, theme] = await Promise.all([getSiteFont(), getSiteTheme()]);

  return (
    <div className='flex min-h-screen flex-col md:flex-row'>
      {/* Mobile top bar + menu sheet; the floating AI assistant works on all sizes */}
      <AdminMobileMenuSheet currentFont={font} currentTheme={theme} />

      {/* Desktop sidebar: menu + appearance toggles (mobile sheet has its own copies) */}
      <aside className='hidden border-e bg-card p-4 md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto'>
        <p className='mb-4 px-3 text-sm font-bold'>{t('dashboard')}</p>
        <AdminSidebar />
        <div className='mt-4 space-y-2 border-t pt-4'>
          <SiteLanguageToggle />
          <SiteFontToggle current={font} />
          <SiteThemeToggle current={theme} />
        </div>
      </aside>
      <main className='min-w-0 flex-1 p-4 pt-0 md:p-6'>
        <div className='mx-auto w-full max-w-7xl'>{children}</div>
      </main>

      {/* Floating AI assistant (launcher + panel), same UX as the storefront */}
      <AdminChat />
    </div>
  );
};

export default AdminLayout;
