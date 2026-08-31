import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getCouponsAdmin } from '@/lib/actions/coupon.actions';
import CouponsManager from './coupons-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: `${t('couponsTitle')} | پناه کالا` };
}

const AdminCouponsPage = async () => {
  const coupons = await getCouponsAdmin();

  return (
    <CouponsManager
      coupons={JSON.parse(JSON.stringify(coupons))}
    />
  );
};

export default AdminCouponsPage;
