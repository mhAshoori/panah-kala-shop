import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import { getCategoriesWithCount } from '@/lib/actions/product.actions';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getCategoriesWithCount(); // warm the category cache for the header

  return (
    <div className='flex min-h-screen flex-col'>
      <Header />
      <main className='flex-1 wrapper'>{children}</main>
      <Footer />
    </div>
  );
}
