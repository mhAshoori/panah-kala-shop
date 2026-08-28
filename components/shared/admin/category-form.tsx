'use client';

import { useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import slugify from 'slugify';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { createCategory, updateCategory } from '@/lib/actions/category.actions';

const ICON_OPTIONS = [
  'smartphone',
  'laptop',
  'headphones',
  'watch',
  'tablet',
  'camera',
  'monitor',
  'gamepad-2',
  'package',
];

const SubmitButton = ({ label }: { label: string }) => {
  const { pending } = useFormStatus();

  return (
    <Button type='submit' disabled={pending}>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {label}
    </Button>
  );
};

const CategoryForm = ({
  type,
  category,
}: {
  type: 'Create' | 'Update';
  category?: {
    id: string;
    name: string;
    nameFa: string;
    slug: string;
    icon: string;
    sortOrder: number;
  };
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const action = type === 'Create' ? createCategory : updateCategory;
  const [state, formAction] = useActionState(action, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push('/admin/categories');
    } else if (state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className='max-w-xl space-y-6'>
      {type === 'Update' && <input type='hidden' name='id' value={category?.id} />}

      <FieldGroup>
        <div className='flex flex-col gap-5 md:flex-row'>
          <Field className='w-full'>
            <FieldLabel htmlFor='name'>{t('categoryEn')}</FieldLabel>
            <Input
              id='name'
              name='name'
              defaultValue={category?.name}
              placeholder='Category (English)'
              required
            />
          </Field>
          <Field className='w-full'>
            <FieldLabel htmlFor='nameFa'>{t('categoryFa')}</FieldLabel>
            <Input
              id='nameFa'
              name='nameFa'
              defaultValue={category?.nameFa}
              placeholder='دسته‌بندی (فارسی)'
              required
            />
          </Field>
        </div>

        <div className='flex flex-col gap-5 md:flex-row'>
          <Field className='w-full'>
            <FieldLabel htmlFor='slug'>{t('slug')}</FieldLabel>
            <div className='flex gap-2'>
              <Input
                id='slug'
                name='slug'
                defaultValue={category?.slug}
                placeholder='category-slug'
              />
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  const name = (
                    document.getElementById('name') as HTMLInputElement
                  )?.value;
                  if (name) {
                    (
                      document.getElementById('slug') as HTMLInputElement
                    ).value = slugify(name, { lower: true, strict: true });
                  }
                }}
              >
                {t('generate')}
              </Button>
            </div>
          </Field>
          <Field className='w-full'>
            <FieldLabel htmlFor='icon'>{t('icon')}</FieldLabel>
            <select
              id='icon'
              name='icon'
              defaultValue={category?.icon ?? 'package'}
              className='h-9 w-full rounded-md border bg-transparent px-2 text-sm outline-none'
            >
              {ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </Field>
          <Field className='w-full md:max-w-32'>
            <FieldLabel htmlFor='sortOrder'>{t('sortOrder')}</FieldLabel>
            <Input
              id='sortOrder'
              name='sortOrder'
              type='number'
              min='0'
              defaultValue={category?.sortOrder ?? 0}
            />
          </Field>
        </div>
      </FieldGroup>

      <SubmitButton label={tCommon('save')} />
    </form>
  );
};

export default CategoryForm;
