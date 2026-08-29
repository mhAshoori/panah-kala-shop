'use client';

import { useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Loader2, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
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
import {
  addUserAddress,
  deleteUserAddress,
  setDefaultAddress,
  updateUserAddress,
} from '@/lib/actions/address.actions';

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

const SubmitButton = ({ label }: { label: string }) => {
  const { pending } = useFormStatus();

  return (
    <Button type='submit' disabled={pending}>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {label}
    </Button>
  );
};

// Shared field set for add/edit
const AddressFields = ({
  address,
}: {
  address?: SavedAddress;
}) => {
  const t = useTranslations('checkout');

  return (
    <FieldGroup>
      <div className='grid gap-4 sm:grid-cols-2'>
        <Field>
          <FieldLabel htmlFor='fullName'>{t('fullName')}</FieldLabel>
          <Input
            id='fullName'
            name='fullName'
            defaultValue={address?.fullName}
            required
            minLength={3}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='phone'>{t('phone')}</FieldLabel>
          <Input
            id='phone'
            name='phone'
            defaultValue={address?.phone}
            required
            inputMode='tel'
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor='streetAddress'>{t('streetAddress')}</FieldLabel>
        <Input
          id='streetAddress'
          name='streetAddress'
          defaultValue={address?.streetAddress}
          required
          minLength={3}
        />
      </Field>
      <div className='grid gap-4 sm:grid-cols-3'>
        <Field>
          <FieldLabel htmlFor='city'>{t('city')}</FieldLabel>
          <Input id='city' name='city' defaultValue={address?.city} required />
        </Field>
        <Field>
          <FieldLabel htmlFor='province'>{t('province')}</FieldLabel>
          <Input
            id='province'
            name='province'
            defaultValue={address?.province}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='postalCode'>{t('postalCode')}</FieldLabel>
          <Input
            id='postalCode'
            name='postalCode'
            defaultValue={address?.postalCode}
            required
            inputMode='numeric'
          />
        </Field>
      </div>
    </FieldGroup>
  );
};

const AddAddressForm = ({ onDone }: { onDone: () => void }) => {
  const t = useTranslations('account');
  const [state, formAction] = useActionState(addUserAddress, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      onDone();
    } else if (state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card>
      <CardContent className='p-4'>
        <form action={formAction} className='space-y-4'>
          <AddressFields />
          <div className='flex gap-2'>
            <SubmitButton label={t('addressSave')} />
            <Button type='button' variant='ghost' onClick={onDone}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const EditAddressForm = ({
  address,
  onDone,
}: {
  address: SavedAddress;
  onDone: () => void;
}) => {
  const t = useTranslations('account');
  const [state, formAction] = useActionState(updateUserAddress, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      onDone();
    } else if (state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card>
      <CardContent className='p-4'>
        <form action={formAction} className='space-y-4'>
          <input type='hidden' name='id' value={address.id} />
          <AddressFields address={address} />
          <div className='flex gap-2'>
            <SubmitButton label={t('addressSave')} />
            <Button type='button' variant='ghost' onClick={onDone}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Full addresses manager: list + add/edit/delete + set default
const AddressesManager = ({ addresses }: { addresses: SavedAddress[] }) => {
  const t = useTranslations('account');
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await deleteUserAddress(id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const makeDefault = (id: string) => {
    startTransition(async () => {
      const res = await setDefaultAddress(id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  if (adding) return <AddAddressForm onDone={() => setAdding(false)} />;
  if (editing)
    return (
      <EditAddressForm
        address={addresses.find((a) => a.id === editing)!}
        onDone={() => setEditing(null)}
      />
    );

  return (
    <div className='space-y-4'>
      {addresses.length === 0 ? (
        <p className='py-8 text-center text-sm text-muted-foreground'>
          {t('noAddresses')}
        </p>
      ) : (
        addresses.map((a) => (
          <Card key={a.id}>
            <CardContent className='space-y-2 p-4'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <MapPin className='h-4 w-4 text-primary' aria-hidden='true' />
                  <span className='text-sm font-medium'>{a.fullName}</span>
                  {a.isDefault && (
                    <span className='inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                      <Star className='h-3 w-3' />
                      {t('defaultAddress')}
                    </span>
                  )}
                </div>
                <div className='flex gap-1'>
                  {!a.isDefault && (
                    <Button
                      size='sm'
                      variant='ghost'
                      disabled={isPending}
                      onClick={() => makeDefault(a.id)}
                    >
                      <Check className='h-4 w-4' />
                      {t('setDefault')}
                    </Button>
                  )}
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => setEditing(a.id)}
                  >
                    <Pencil className='h-4 w-4' />
                    {t('edit')}
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='text-destructive hover:text-destructive'
                    disabled={isPending}
                    onClick={() => {
                      if (window.confirm(t('deleteAddressConfirm'))) {
                        remove(a.id);
                      }
                    }}
                  >
                    <Trash2 className='h-4 w-4' />
                    {t('delete')}
                  </Button>
                </div>
              </div>
              <p
                dir='rtl'
                className={cn('text-xs text-muted-foreground', 'text-right')}
              >
                {a.province}، {a.city}، {a.streetAddress}
              </p>
              <p
                dir='ltr'
                className='text-xs text-muted-foreground'
                style={{ textAlign: 'right' }}
              >
                {a.phone} · {a.postalCode}
              </p>
            </CardContent>
          </Card>
        ))
      )}

      {!adding && (
        <Button variant='outline' onClick={() => setAdding(true)} className='w-full'>
          <Plus className='h-4 w-4' />
          {t('addAddress')}
        </Button>
      )}
    </div>
  );
};

export default AddressesManager;
