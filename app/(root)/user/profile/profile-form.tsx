'use client';

import { useState, useTransition } from 'react';
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
} from 'lucide-react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { updateProfileSchema } from '@/lib/validator';
import {
  updateProfile,
  updateContact,
  updateProfileImage,
  clearProfileImage,
  requestContactChangeCode,
} from '@/lib/actions/user.actions';
import ImageUploadButton from '@/components/shared/image-upload';
import { useRouter } from 'next/navigation';
import PhoneField from '@/components/shared/auth/phone-field';
import OtpInput from '@/components/shared/otp-input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProfileData = {
  name: string;
  email?: string | null;
  mobile?: string | null;
  image?: string | null;
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

// New-value input lives inside the dialog — mirrored to a hidden input for
// the server action (the form posts via useActionState).
const ChangeContactDialog = ({
  type,
  currentValue,
  open,
  onOpenChange,
}: {
  type: ContactType;
  currentValue: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  const [newValue, setNewValue] = useState('');
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [codesSent, setCodesSent] = useState(false);
  const [valueLocked, setValueLocked] = useState(false);

  const reset = () => {
    setNewValue('');
    setOldCode('');
    setNewCode('');
    setCodesSent(false);
    setValueLocked(false);
  };

  // Direct action calls (no useActionState) so results are consumed in the
  // transition callback — no setState-in-effect, no refs during render.
  const handleRequestCodes = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('type', type);
      fd.set(
        'newValue',
        type === 'mobile' ? `+98${newValue}` : newValue
      );
      const res = await requestContactChangeCode(null, fd);
      if (res.success) {
        toast.success(res.message);
        setCodesSent(true);
        setValueLocked(true); // freeze the new-value field once codes are out
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleUpdateContact = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set('type', type);
      fd.set('newValue', type === 'mobile' ? `+98${newValue}` : newValue);
      fd.set('oldCode', oldCode);
      fd.set('newCode', newCode);
      const res = await updateContact(null, fd);
      if (res.success) {
        toast.success(res.message);
        reset();
        onOpenChange(false);
      } else {
        toast.error(res.message);
      }
    });
  };

  const sendCodesDisabled =
    type === 'email'
      ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue)
      : newValue.length !== 10;

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) reset();
      onOpenChange(next);
    }}>
      <DialogContent dir='rtl' className='max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-right'>
            {type === 'email' ? tAccount('newEmail') : tAccount('newMobile')}
          </DialogTitle>
          <DialogDescription className='text-right'>
            {tAccount('contactChangeWarning')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdateContact} className='space-y-4'>
          {/* Step 1: enter the NEW contact, then request both codes */}
          <Field>
            <FieldLabel htmlFor={`dialog-new-${type}`}>
              {type === 'email' ? tAccount('newEmail') : tAccount('newMobile')}
            </FieldLabel>
            {type === 'email' ? (
              <Input
                id={`dialog-new-${type}`}
                type='email'
                dir='ltr'
                value={newValue}
                disabled={valueLocked}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder='name@example.com'
              />
            ) : (
              <PhoneField
                id={`dialog-new-${type}`}
                value={newValue}
                onChange={setNewValue}
                disabled={valueLocked}
              />
            )}
          </Field>

          {/* Request both codes (current + new contact) */}
          {!codesSent ? (
            <Button
              type='button'
              variant='outline'
              className='w-full'
              disabled={sendCodesDisabled || isPending}
              onClick={handleRequestCodes}
            >
              {isPending && <Loader className='h-4 w-4 animate-spin' />}
              <Send className='h-4 w-4' />
              {tAccount('sendCodes')}
            </Button>
          ) : (
            <p className='text-center text-xs text-emerald-600'>
              {tAccount('codesSentHint', {
                current: currentValue ?? '—',
                new: newValue,
              })}
            </p>
          )}

          {/* Step 2: both digit inputs — enabled only after codes sent */}
          <Field>
            <FieldLabel>{tAccount('codePrevContact')}</FieldLabel>
            <OtpInput value={oldCode} onChange={setOldCode} disabled={!codesSent} />
          </Field>
          <Field>
            <FieldLabel>{tAccount('codeNewContact')}</FieldLabel>
            <OtpInput value={newCode} onChange={setNewCode} disabled={!codesSent} />
          </Field>

          <DialogFooter className='flex-row-reverse gap-2'>
            <Button
              type='submit'
              disabled={!codesSent || oldCode.length !== 6 || newCode.length !== 6}
            >
              {tCommon('save')}
            </Button>
            <DialogClose asChild>
              <Button type='button' variant='ghost' onClick={reset}>
                {tCommon('cancel')}
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ContactRow = ({
  type,
  value,
}: {
  type: ContactType;
  value?: string | null;
}) => {
  const tAccount = useTranslations('account');
  const [dialogOpen, setDialogOpen] = useState(false);

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
            dir='ltr'
            className='max-w-56'
          />
        </div>
        <Button size='sm' variant='ghost' onClick={() => setDialogOpen(true)}>
          <Pencil className='h-4 w-4' />
          {tAccount('change')}
        </Button>
      </div>
      <ChangeContactDialog
        type={type}
        currentValue={value ?? null}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
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
  image,
  nationalId,
  cardNumber,
  sheba,
  birthDate,
  defaultAddress,
}: ProfileData & { image?: string | null }) => {
  const { update } = useSession();
  const t = useTranslations('account');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      {/* Avatar: upload, replace or delete (delete needs confirmation) */}
      <Card>
        <CardContent className='flex flex-wrap items-center gap-4 p-4'>
          {image ? (
            <>
              <Image
                src={image}
                alt={name}
                width={64}
                height={64}
                className='h-16 w-16 rounded-full object-cover'
                unoptimized
              />
              <div className='flex flex-wrap gap-2'>
                <ImageUploadButton
                  folder='avatars'
                  label={t('changeAvatar')}
                  onUploaded={(url) => {
                    startTransition(async () => {
                      const res = await updateProfileImage(url);
                      if (res.success) {
                        await update({ image: url });
                        toast.success(res.message);
                        router.refresh();
                      } else {
                        toast.error(res.message);
                      }
                    });
                  }}
                />
                <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                  <AlertDialogTrigger asChild>
                    <Button type='button' variant='outline' size='sm'>
                      {t('deleteAvatar')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir='rtl'>
                    <AlertDialogHeader>
                      <AlertDialogTitle className='text-right'>
                        {t('deleteAvatarConfirmTitle')}
                      </AlertDialogTitle>
                      <AlertDialogDescription className='text-right'>
                        {t('deleteAvatarConfirmDesc')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className='flex-row-reverse gap-2'>
                      <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        disabled={deleting}
                        onClick={(e) => {
                          e.preventDefault(); // keep dialog open while working
                          setDeleting(true);
                          startTransition(async () => {
                            const res = await clearProfileImage();
                            setDeleting(false);
                            setConfirmDelete(false);
                            if (res.success) {
                              await update({ image: null });
                              toast.success(res.message);
                              router.refresh();
                            } else {
                              toast.error(res.message);
                            }
                          });
                        }}
                      >
                        {deleting && <Loader className='h-4 w-4 animate-spin' />}
                        {t('delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <>
              <span className='flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-medium'>
                {name.charAt(0).toUpperCase()}
              </span>
              <ImageUploadButton
                folder='avatars'
                label={t('uploadAvatar')}
                onUploaded={(url) => {
                  startTransition(async () => {
                    const res = await updateProfileImage(url);
                    if (res.success) {
                      await update({ image: url });
                      toast.success(res.message);
                      router.refresh();
                    } else {
                      toast.error(res.message);
                    }
                  });
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Contact rows — verified change flows; side-by-side on md+ */}
      <Card>
        <CardContent className='grid gap-4 p-4 md:grid-cols-2'>
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

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
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
