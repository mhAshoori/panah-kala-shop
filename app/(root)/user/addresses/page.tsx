import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import AddressesManager, {
  type SavedAddress,
} from '@/components/shared/user/addresses-manager';
import { getValidUserId } from '@/lib/auth-helpers';
import { prisma } from '@/db/prisma';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: 'fa', namespace: 'account' });
  return { title: t('addresses') };
}

const AddressesPage = async () => {
  const userId = await getValidUserId();
  const t = await getTranslations('account');

  const addresses = userId
    ? await prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      })
    : [];

  const saved = addresses.map((a) => ({
    id: a.id,
    isDefault: a.isDefault,
    fullName: a.fullName,
    streetAddress: a.streetAddress,
    city: a.city,
    province: a.province,
    postalCode: a.postalCode,
    phone: a.phone,
  })) as SavedAddress[];

  return (
    <div className='space-y-4'>
      <h1 className='h2-bold'>{t('addresses')}</h1>
      <AddressesManager addresses={saved} />
    </div>
  );
};

export default AddressesPage;
