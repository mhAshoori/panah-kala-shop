import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/shared/pagination';
import AdminSearch from '@/components/shared/admin/search';
import DeleteDialog from '@/components/shared/delete-dialog';
import { getAllProducts, deleteProduct } from '@/lib/actions/product.actions';
import { formatCurrency, formatId } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

const AdminProductsPage = async (props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page: string; q?: string }>;
}) => {
  const { locale } = await props.params;
  const { page, q } = await props.searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');

  const products = await getAllProducts({
    query: q,
    page: Number(page) || 1,
  });

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h1 className='h2-bold'>{t('products')}</h1>
        <Button asChild>
          <Link href='/admin/products/create'>{t('createProduct')}</Link>
        </Button>
      </div>
      <AdminSearch />

      <div className='overflow-x-auto rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('id')}</TableHead>
              <TableHead>{t('product')}</TableHead>
              <TableHead>{t('category')}</TableHead>
              <TableHead>{t('price')}</TableHead>
              <TableHead>{t('stock')}</TableHead>
              <TableHead>{t('rating')}</TableHead>
              <TableHead className='text-end'>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className='text-center text-muted-foreground'>
                  {tCommon('notFound')}
                </TableCell>
              </TableRow>
            ) : (
              products.data.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className='font-mono text-xs'>
                    {formatId(product.id)}
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <Image
                        src={product.images[0]}
                        alt={locale === 'fa' ? product.nameFa : product.name}
                        className='h-10 w-10 rounded-sm object-cover'
                        width={40}
                        height={40}
                        unoptimized
                      />
                      <span className='max-w-48 truncate'>
                        {locale === 'fa' ? product.nameFa : product.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {locale === 'fa' ? product.categoryFa : product.category}
                  </TableCell>
                  <TableCell>{formatCurrency(product.price)}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>{product.rating}</TableCell>
                  <TableCell className='flex justify-end gap-1'>
                    <Button asChild size='sm' variant='outline'>
                      <Link href={`/admin/products/${product.id}`}>
                        {t('edit')}
                      </Link>
                    </Button>
                    <DeleteDialog id={product.id} action={deleteProduct} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination page={Number(page) || 1} totalPages={products.totalPages} />
    </div>
  );
};

export default AdminProductsPage;
