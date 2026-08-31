'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { updateUser } from '@/lib/actions/user.actions';

const SubmitButton = ({ label }: { label: string }) => {
  const { pending } = useFormStatus();

  return (
    <Button type='submit' disabled={pending}>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {label}
    </Button>
  );
};

const UpdateUserForm = ({
  user,
}: {
  user: { id: string; name: string; role: string };
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const adminApproved = useRef(false);

  const [state, formAction] = useActionState(updateUser, {
    success: false,
    message: '',
  });
  const [role, setRole] = useState(user.role);
  const [confirmAdmin, setConfirmAdmin] = useState(false);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push('/admin/users');
    } else if (state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Granting admin is a privilege escalation — require explicit approval once
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (role === 'admin' && user.role !== 'admin' && !adminApproved.current) {
      e.preventDefault();
      setConfirmAdmin(true);
    }
  };

  const approveAndSubmit = () => {
    adminApproved.current = true;
    setConfirmAdmin(false);
    // Allow React to flush the dialog close before re-submitting
    setTimeout(() => formRef.current?.requestSubmit(), 0);
  };

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        className='max-w-md space-y-6'
      >
        <input type='hidden' name='id' value={user.id} />
        <input type='hidden' name='role' value={role} />
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor='name'>{t('name')}</FieldLabel>
            <Input
              id='name'
              name='name'
              defaultValue={user.name}
              required
              minLength={3}
            />
          </Field>
          <Field>
            <FieldLabel>{t('role')}</FieldLabel>
            <RadioGroup
              value={role}
              onValueChange={setRole}
              className='flex gap-4'
            >
              <Label className='flex items-center gap-2 font-normal'>
                <RadioGroupItem value='user' />
                user
              </Label>
              <Label className='flex items-center gap-2 font-normal'>
                <RadioGroupItem value='admin' />
                admin
              </Label>
            </RadioGroup>
          </Field>
        </FieldGroup>
        <SubmitButton label={tCommon('save')} />
      </form>

      <AlertDialog open={confirmAdmin} onOpenChange={setConfirmAdmin}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <ShieldAlert className='h-5 w-5 text-amber-500' />
              {t('grantAdminTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('grantAdminConfirm', { name: user.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <Button variant='destructive' onClick={approveAndSubmit}>
              {t('grantAdminYes')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UpdateUserForm;
