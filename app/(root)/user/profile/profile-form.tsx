'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SessionProvider, useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Loader,
  Mail,
  MapPin,
  Pencil,
  Smartphone,
  X,
} from 'lucide-react';
import { useFormStatus } from 'react-dom';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { updateProfileSchema } from '@/lib/validator';
import {
  updateProfile,
  updateContact,
} from '@/lib/actions/user.actions';
import PhoneField from '@/components/shared/auth/phone-field';
import { cn } from '@/lib/utils';

type ProfileData = {
  name: string;
  email?: string | null;
  mobile?: string | null;
  nationalId?: string | null;
  cardNumber?: string | null;
  sheba?: string | null;
  birthDate?: Date | null;
  defaultAddress?: string | null;
};

// ---------------------------------------------------------------------------
// Contact change row: disabled input + verification-based change flow
// ---------------------------------------------------------------------------

type ContactType = 'email' | 'mobile';

const ChangeContactForm = ({
  type,
  onDone,
}: {
  type: ContactType;
  onDone: () => void;
}) => {
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');
  const [state, formAction] = useActionState(updateContact, {
    success: false,
    message: '',
  });
  const [newValue, setNewValue] = useState('');

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
    <form action={formAction} className='space-y-3 rounded-xl border p-3'>
      <input type='hidden' name='type' value={type} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${type}-old-code`}>
            {tAccount('codePrevContact')}
          </FieldLabel>
          <Input
            id={`${type}-old-code`}
            name='oldCode'
            inputMode='numeric'
            dir='ltr'
            defaultValue=''
            placeholder='123456'
            required
          />
          <FieldDescription dir='ltr'>mock: 123456</FieldDescription>
        </Field>
        {type === 'email' ? (
          <Field>
            <FieldLabel htmlFor='new-email'>{tAccount('newEmail')}</FieldLabel>
            <Input id='new-email' name='newValue' type='email' dir='ltr' required />
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor='new-mobile'>{tAccount('newMobile')}</FieldLabel>
            <PhoneField
              id='new-mobile'
              name='newValue'
              value={newValue}
              onChange={setNewValue}
            />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor={`${type}-new-code`}>
            {tAccount('codeNewContact')}
          </FieldLabel>
          <Input
            id={`${type}-new-code`}
            name='newCode'
            inputMode='numeric'
            dir='ltr'
            defaultValue=''
            placeholder='456789'
            required
          />
          <FieldDescription dir='ltr'>mock: 456789</FieldDescription>
        </Field>
      </FieldGroup>
      <div className='flex gap-2'>
        <Button type='submit'>
          {tCommon('save')}
        </Button>
        <Button type='button' variant='ghost' onClick={onDone}>
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  );
};

const ContactRow = ({
  type,
  value,
}: {
  type: ContactType;
  value?: string | null;
}) => {
  const tCommon = useTranslations('common');
  const tAccount = useTranslations('account');
  const [changing, setChanging] = useState(false);

  const display = value ?? '—';
  const Icon = type === 'email' ? Mail : Smartphone;

  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Icon className='h-4 w-4' aria-hidden='true' />
          </span>
          <Input
            id={`contact-${type}`}
            value={display}
            disabled
            dir={type === 'email' ? 'ltr' : 'ltr'}
            className='max-w-56'
          />
        </div>
        <Button
          size='sm'
          variant='ghost'
          onClick={() => setChanging((c) => !c)}
          aria-expanded={changing}
        >
          {changing ? (
            <>
              <X className='h-4 w-4' />
              {tCommon('cancel')}
            </>
          ) : (
            <>
              <Pencil className='h-4 w-4' />
              {tAccount('change')}
            </>
          )}
        </Button>
      </div>
      {changing && (
        <ChangeContactForm type={type} onDone={() => setChanging(false)} />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main profile form
// ---------------------------------------------------------------------------

const SubmitButton = () => {
  const { pending } = useFormStatus();
  const t = useTranslations('account');
  const tc = useTranslations('common');

  return (
    <Button type='submit' disabled={pending}>
      {pending ? (
        <>
          <Loader className='animate-spin w-4 h-4' /> {tc('loading')}
        </>
      ) : (
        t('updateProfile')
      )}
    </Button>
  );
};

const ProfileFormInner = ({
  name,
  email,
  mobile,
  nationalId,
  cardNumber,
  sheba,
  birthDate,
  defaultAddress,
}: ProfileData) => {
  const { update } = useSession();
  const t = useTranslations('account');
  const locale = useLocale();
  const startTransition = (fn: () => void) => fn();

  const form = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name,
      nationalId: nationalId ?? '',
      cardNumber: cardNumber ?? '',
      sheba: sheba ?? '',
      birthDate: birthDate
        ? new Date(birthDate).toISOString().slice(0, 10)
        : '',
    },
  });

  const onSubmit = form.handleSubmit(
    async (values: z.infer<typeof updateProfileSchema>) => {
      startTransition(async () => {
        const res = await updateProfile(values);

        if (!res.success) {
          toast.error(res.message);
          return;
        }

        // Refresh the session so the header user name updates too
        await update({ name: values.name });
        toast.success(t('saved'));
      });
    }
  );

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      {/* Contact rows — verified change flows */}
      <Card>
        <CardContent className='grid gap-4 p-4'>
          <ContactRow type='email' value={email} />
          <ContactRow type='mobile' value={mobile} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className='p-4'>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='name'>{t('name')}</FieldLabel>
              <Controller
                name='name'
                control={form.control}
                render={({ field, fieldState }) => (
                  <div data-invalid={fieldState.invalid}>
                    <Input
                      {...field}
                      id='name'
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </div>
                )}
              />
            </Field>

            <div className='grid gap-4 sm:grid-cols-2'>
              <Field>
                <FieldLabel htmlFor='nationalId'>
                  {t('nationalId')}
                </FieldLabel>
                <Controller
                  name='nationalId'
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div data-invalid={fieldState.invalid}>
                      <Input {...field} id='nationalId' inputMode='numeric' />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </div>
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='birthDate'>{t('birthDate')}</FieldLabel>
                <Controller
                  name='birthDate'
                  control={form.control}
                  render={({ field }) => (
                    <Input {...field} id='birthDate' type='date' />
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='cardNumber'>{t('cardNumber')}</FieldLabel>
                <Controller
                  name='cardNumber'
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div data-invalid={fieldState.invalid}>
                      <Input {...field} id='cardNumber' inputMode='numeric' />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </div>
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='sheba'>{t('sheba')}</FieldLabel>
                <Controller
                  name='sheba'
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div data-invalid={fieldState.invalid}>
                      <Input {...field} id='sheba' placeholder='IR' dir='ltr' />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </div>
                  )}
                />
              </Field>
            </div>
          </FieldGroup>
          <div className='mt-4'>
            <SubmitButton />
          </div>
        </CardContent>
      </Card>

      {/* Default address summary + link */}
      <Card>
        <CardContent className='space-y-1 p-4'>
          <div className='flex items-center gap-2'>
            <MapPin className='h-4 w-4 text-primary' aria-hidden='true' />
            <p className='text-sm font-medium'>{t('defaultAddressHint')}</p>
          </div>
          {defaultAddress ? (
            <p
              dir='rtl'
              className={cn(
                'text-xs text-muted-foreground',
                locale === 'fa' && 'text-right'
              )}
            >
              {defaultAddress}
            </p>
          ) : (
            <p className='text-xs text-muted-foreground'>{t('noAddresses')}</p>
          )}
          <Button asChild variant='link' size='sm' className='h-auto p-0'>
            <a href='/user/addresses'>{t('manageAddresses')}</a>
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};

const ProfileForm = (props: ProfileData) => {
  return (
    <SessionProvider>
      <ProfileFormInner {...props} />
    </SessionProvider>
  );
};

export default ProfileForm;
