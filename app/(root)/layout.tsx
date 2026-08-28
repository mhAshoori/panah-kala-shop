import Header from '@/components/shared/header';
import Footer from '@/components/footer';
import CategoryDock from '@/components/shared/category/category-dock';
import { getCategoriesWithCount } from '@/lib/actions/product.actions';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategoriesWithCount();

  return (
    <div className='flex min-h-screen flex-col'>
      <Header />
      <main className='flex-1 wrapper pb-20'>{children}</main>
      <Footer />
      {/* Floating category navigation ("hovering bar") */}
      <CategoryDock categories={categories} />
    </div>
  );
}
