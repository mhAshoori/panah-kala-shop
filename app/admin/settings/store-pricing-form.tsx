'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { updateStorePricing } from '@/lib/actions/settings.actions';

const StorePricingForm = ({
  initialShippingFee,
  initialFreeShippingThreshold,
  initialTaxRate,
  initialStorePageSize,
}: {
  initialShippingFee: number;
  initialFreeShippingThreshold: number;
  initialTaxRate: number;
  initialStorePageSize: number;
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [shippingFee, setShippingFee] = useState(String(initialShippingFee));
  const [threshold, setThreshold] = useState(String(initialFreeShippingThreshold));
  const [taxRate, setTaxRate] = useState(String(initialTaxRate));
  const [storePageSize, setStorePageSize] = useState(String(initialStorePageSize));
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const res = await updateStorePricing(
        Number(shippingFee),
        Number(threshold),
        Number(taxRate),
        Number(storePageSize)
      );
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Card>
      <CardContent className='p-4'>
        <h2 className='mb-4 text-lg font-semibold'>{t('pricingTitle')}</h2>
        <FieldGroup className='max-w-2xl'>
          <Field>
            <FieldLabel htmlFor='shipping-fee'>{t('shippingFeeLabel')}</FieldLabel>
            <Input
              id='shipping-fee'
              type='number'
              min={0}
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
              dir='ltr'
            />
            <FieldDescription>{t('shippingFeeHint')}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor='free-threshold'>
              {t('freeShippingThresholdLabel')}
            </FieldLabel>
            <Input
              id='free-threshold'
              type='number'
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              dir='ltr'
            />
            <FieldDescription>{t('freeShippingThresholdHint')}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor='tax-rate'>{t('taxRateLabel')}</FieldLabel>
            <Input
              id='tax-rate'
              type='number'
              min={0}
              max={1}
              step={0.01}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              dir='ltr'
            />
            <FieldDescription>{t('taxRateHint')}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor='store-page-size'>
              {t('storePageSizeLabel')}
            </FieldLabel>
            <Input
              id='store-page-size'
              type='number'
              min={2}
              max={48}
              value={storePageSize}
              onChange={(e) => setStorePageSize(e.target.value)}
              dir='ltr'
            />
            <FieldDescription>{t('storePageSizeHint')}</FieldDescription>
          </Field>

          <Button onClick={save} disabled={isPending} className='w-fit'>
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Save className='h-4 w-4' />
            )}
            {tCommon('save')}
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};

export default StorePricingForm;
