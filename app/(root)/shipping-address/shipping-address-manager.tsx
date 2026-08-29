'use client';

import { useState, useTransition, useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { addUserAddress, setDefaultAddress } from '@/lib/actions/address.actions';

export type SavedAddress = {
  id: string;
  isDefault: boolean;
  fullName: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
};

const SubmitButton = () => {
  const { pending } = useFormStatus();
  const t = useTranslations('checkout');

  return (
    <Button type='submit' disabled={pending} className='w-full'>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {t('shippingAddress')}
    </Button>
  );
};

// Empty-state inline form: add the first address
const NewAddressForm = ({ onSaved }: { onSaved: () => void }) => {
  const t = useTranslations('checkout');
  const [state, formAction] = useActionState(addUserAddress, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      onSaved();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card>
      <CardContent className='p-4'>
        <form action={formAction} className='space-y-4'>
          <FieldGroup>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field>
                <FieldLabel htmlFor='fullName'>{t('fullName')}</FieldLabel>
                <Input id='fullName' name='fullName' required minLength={3} />
              </Field>
              <Field>
                <FieldLabel htmlFor='phone'>{t('phone')}</FieldLabel>
                <Input
                  id='phone'
                  name='phone'
                  required
                  inputMode='tel'
                  placeholder='09121234567'
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor='streetAddress'>
                {t('streetAddress')}
              </FieldLabel>
              <Input
                id='streetAddress'
                name='streetAddress'
                required
                minLength={3}
              />
            </Field>
            <div className='grid gap-4 sm:grid-cols-3'>
              <Field>
                <FieldLabel htmlFor='city'>{t('city')}</FieldLabel>
                <Input id='city' name='city' required minLength={2} />
              </Field>
              <Field>
                <FieldLabel htmlFor='province'>{t('province')}</FieldLabel>
                <Input id='province' name='province' required minLength={2} />
              </Field>
              <Field>
                <FieldLabel htmlFor='postalCode'>{t('postalCode')}</FieldLabel>
                <Input
                  id='postalCode'
                  name='postalCode'
                  required
                  inputMode='numeric'
                />
              </Field>
            </div>
          </FieldGroup>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
};

const ShippingAddressPicker = ({
  addresses,
}: {
  addresses: SavedAddress[];
}) => {
  const t = useTranslations('checkout');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? ''
  );

  const continueToPayment = () => {
    if (!selected) return;
    startTransition(async () => {
      await setDefaultAddress(selected);
      router.push('/payment-method');
    });
  };

  return (
    <div className='space-y-3'>
      {addresses.map((a) => (
        <label
          key={a.id}
          htmlFor={`addr-${a.id}`}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50',
            selected === a.id && 'border-primary bg-primary/5'
          )}
        >
          <input
            type='radio'
            id={`addr-${a.id}`}
            name='address'
            checked={selected === a.id}
            onChange={() => setSelected(a.id)}
            className='mt-1'
          />
          <span dir='rtl' className='min-w-0 flex-1 text-right'>
            <span className='block text-sm font-medium'>{a.fullName}</span>
            <span className='mt-0.5 block text-xs text-muted-foreground'>
              {a.province}، {a.city}، {a.streetAddress}
            </span>
            <span className='mt-0.5 block text-xs text-muted-foreground' dir='ltr' style={{ textAlign: 'right' }}>
              {a.phone} · {a.postalCode}
            </span>
          </span>
          {selected === a.id && (
            <Check className='h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
          )}
        </label>
      ))}

      <Button onClick={continueToPayment} disabled={isPending || !selected} className='w-full'>
        {isPending && <Loader2 className='h-4 w-4 animate-spin' />}
        {t('paymentMethod')}
      </Button>
    </div>
  );
};

const ShippingAddressManager = ({
  addresses,
}: {
  addresses: SavedAddress[];
}) => {
  const t = useTranslations('checkout');
  const router = useRouter();
  const [showForm, setShowForm] = useState(addresses.length === 0);

  const refresh = () => router.refresh();

  return (
    <div className='space-y-4'>
      {addresses.length > 0 && (
        <ShippingAddressPicker addresses={addresses} />
      )}

      {showForm ? (
        <NewAddressForm onSaved={refresh} />
      ) : (
        <Button variant='outline' onClick={() => setShowForm(true)} className='w-full'>
          <Plus className='h-4 w-4' />
          {t('addAddress')}
        </Button>
      )}

      {addresses.length > 0 && (
        <p className='text-center text-xs text-muted-foreground'>
          {t('manageHint')}
        </p>
      )}
    </div>
  );
};

export default ShippingAddressManager;
