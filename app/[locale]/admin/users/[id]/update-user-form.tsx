'use client';

import { useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

  const [state, formAction] = useActionState(updateUser, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push('/admin/users');
    } else if (state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className='max-w-md space-y-6'>
      <input type='hidden' name='id' value={user.id} />
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
          <RadioGroup defaultValue={user.role} name='role' className='flex gap-4'>
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
  );
};

export default UpdateUserForm;
