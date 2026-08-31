'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Ticket, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import DeleteDialog from '@/components/shared/delete-dialog';
import { formatNumberLocale } from '@/lib/persian';
import {
  createCoupon,
  deleteCoupon,
  updateCoupon,
  type CouponAdminInput,
} from '@/lib/actions/coupon.actions';

type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: string;
  minCartTotal: string;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

const emptyForm: CouponAdminInput = {
  code: '',
  type: 'percent',
  value: '',
  minCartTotal: '0',
  expiresAt: '',
  usageLimit: '',
  isActive: true,
};

const CouponsManager = ({ coupons }: { coupons: CouponRow[] }) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = typeof window !== 'undefined' ? document.documentElement.lang || 'fa' : 'fa';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CouponAdminInput>(emptyForm);
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (c: CouponRow) => {
    setForm({
      id: c.id,
      code: c.code,
      type: c.type as 'percent' | 'fixed',
      value: String(Number(c.value)),
      minCartTotal: String(Number(c.minCartTotal)),
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      usageLimit: c.usageLimit === null ? '' : String(c.usageLimit),
      isActive: c.isActive,
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const save = () => {
    startTransition(async () => {
      const res = editingId
        ? await updateCoupon({ ...form, id: editingId })
        : await createCoupon(form);
      if (res.success) {
        toast.success(res.message);
        setShowForm(false);
        setEditingId(null);
      } else {
        toast.error(res.message);
      }
    });
  };

  const field =
    (key: keyof CouponAdminInput) => ({
      value: String(form[key] ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    });

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h1 className='h2-bold'>{t('couponsTitle')}</h1>
        {!showForm && (
          <Button onClick={openCreate} size='sm'>
            <Plus className='h-4 w-4' />
            {t('couponCreate')}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent className='p-4'>
            <FieldGroup>
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field>
                  <FieldLabel htmlFor='code'>{t('couponCodeLabel')}</FieldLabel>
                  <Input id='code' {...field('code')} dir='ltr' required />
                </Field>
                <Field>
                  <FieldLabel htmlFor='type'>{t('couponType')}</FieldLabel>
                  <select
                    id='type'
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        type: e.target.value as 'percent' | 'fixed',
                      }))
                    }
                    className='h-9 w-full rounded-md border bg-transparent px-2 text-sm outline-none'
                  >
                    <option value='percent'>{t('couponTypePercent')}</option>
                    <option value='fixed'>{t('couponTypeFixed')}</option>
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor='value'>
                    {form.type === 'percent' ? '٪' : tCommon('currency')}
                  </FieldLabel>
                  <Input
                    id='value'
                    type='number'
                    step='0.01'
                    min='0'
                    {...field('value')}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor='minCartTotal'>
                    {t('couponMinCart')}
                  </FieldLabel>
                  <Input
                    id='minCartTotal'
                    type='number'
                    min='0'
                    {...field('minCartTotal')}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor='expiresAt'>
                    {t('couponExpires')}
                  </FieldLabel>
                  <Input
                    id='expiresAt'
                    type='date'
                    {...field('expiresAt')}
                    dir='ltr'
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor='usageLimit'>
                    {t('couponUsageLimit')}
                  </FieldLabel>
                  <Input
                    id='usageLimit'
                    type='number'
                    min='1'
                    {...field('usageLimit')}
                    placeholder='∞'
                  />
                </Field>
              </div>
              <Label className='flex items-center gap-2 text-sm font-normal'>
                <Checkbox
                  checked={form.isActive}
                  onCheckedChange={(c) =>
                    setForm((f) => ({ ...f, isActive: c === true }))
                  }
                />
                {t('couponActive')}
              </Label>
            </FieldGroup>
            <div className='mt-4 flex gap-2'>
              <Button onClick={save} disabled={isPending}>
                {isPending && <Loader2 className='h-4 w-4 animate-spin' />}
                {tCommon('save')}
              </Button>
              <Button
                variant='ghost'
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                disabled={isPending}
              >
                <X className='h-4 w-4' />
                {tCommon('cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {coupons.length === 0 && !showForm ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 p-10 text-center'>
            <Ticket className='h-10 w-10 text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>{t('couponsEmpty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-3'>
          {coupons.map((c) => (
            <Card key={c.id}>
              <CardContent className='flex flex-wrap items-center justify-between gap-3 p-4'>
                <div className='flex min-w-0 flex-col gap-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='rounded bg-primary/10 px-2 py-0.5 font-mono text-sm font-bold text-primary'>
                      {c.code}
                    </span>
                    <span className='text-sm font-semibold'>
                      {c.type === 'percent'
                        ? `٪${formatNumberLocale(Number(c.value), locale)}`
                        : `${formatNumberLocale(Number(c.value), locale)} ${tCommon('currency')}`}
                    </span>
                    {!c.isActive && (
                      <span className='rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground'>
                        {t('couponInactiveLabel')}
                      </span>
                    )}
                    {c.expiresAt && new Date(c.expiresAt) < new Date() && (
                      <span className='rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive'>
                        {t('couponExpiredLabel')}
                      </span>
                    )}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {t('couponUsedCount', {
                      used: formatNumberLocale(c.usedCount, locale),
                      limit: c.usageLimit === null ? '∞' : formatNumberLocale(c.usageLimit, locale),
                    })}
                    {Number(c.minCartTotal) > 0 &&
                      ` · ${t('couponMinCartShort')}: ${formatNumberLocale(Number(c.minCartTotal), locale)} ${tCommon('currency')}`}
                    {c.expiresAt &&
                      ` · ${t('couponExpiresShort')}: ${c.expiresAt.slice(0, 10)}`}
                  </p>
                </div>
                <div className='flex gap-1'>
                  <Button size='sm' variant='ghost' onClick={() => openEdit(c)}>
                    <Pencil className='h-4 w-4' />
                    {tCommon('edit')}
                  </Button>
                  <DeleteDialog
                    id={c.id}
                    action={deleteCoupon}
                    confirmKey='couponDeleteConfirm'
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CouponsManager;
