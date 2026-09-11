'use client';

import { useState } from 'react';
import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { updateHomeBlock, moveHomeBlock } from '@/lib/actions/home.actions';
import ImageUploadButton from '@/components/shared/image-upload';
import { cn } from '@/lib/utils';

export type BlockField = {
  /** Dot-path into the block object, e.g. "title.fa" or "limit" */
  path: string;
  /** i18n label key under the admin namespace */
  label: string;
  type: 'text' | 'textarea' | 'number' | 'image' | 'boolean';
  /** Renders two inputs (fa + en) writing to "<path>.fa" / "<path>.en" */
  localized?: boolean;
  /** For select-style fields rendered by the parent (product pickers etc.) */
  options?: { value: string; label: string }[];
};

type BlockData = Record<string, unknown>;

function getPath(obj: BlockData, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, part) =>
        typeof acc === 'object' && acc !== null
          ? (acc as BlockData)[part]
          : undefined,
      obj
    );
}

function setPath(obj: BlockData, path: string, value: unknown): BlockData {
  const [head, ...rest] = path.split('.');
  if (rest.length === 0) return { ...obj, [head]: value };
  const child = obj[head];
  // Arrays (banners, icon-box items) must stay arrays — object-spreading
  // an array yields a plain object and the homepage's .map() then crashes
  if (Array.isArray(child)) {
    const [idxStr, ...arrRest] = rest;
    const copy = child.slice();
    const idx = Number(idxStr);
    if (arrRest.length === 0) {
      copy[idx] = value;
    } else {
      copy[idx] = setPath(
        (typeof copy[idx] === 'object' && copy[idx] !== null
          ? copy[idx]
          : {}) as BlockData,
        arrRest.join('.'),
        value
      );
    }
    return { ...obj, [head]: copy };
  }
  const childObj = (typeof child === 'object' && child !== null
    ? child
    : {}) as BlockData;
  return { ...obj, [head]: setPath(childObj, rest.join('.'), value) };
}

/**
 * Generic editor for a single homepage content block: renders the fields
 * declared by the server page plus an enable toggle and a save button.
 */
const HomeBlockEditor = ({
  blockKey,
  title,
  fields,
  initialEnabled,
  initialData,
  reorderable = false,
}: {
  blockKey: string;
  title: string;
  fields: BlockField[];
  initialEnabled: boolean;
  initialData: BlockData;
  /** Homepage blocks only: show up/down reorder buttons */
  reorderable?: boolean;
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [data, setData] = useState<BlockData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [isMoving, startMove] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isDirty =
    enabled !== initialEnabled ||
    JSON.stringify(data) !== JSON.stringify(initialData);

  const save = () => {
    startTransition(async () => {
      const res = await updateHomeBlock(
        blockKey,
        enabled,
        data as Record<string, unknown>
      );
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  // Revert to the values the page loaded with
  const discard = () => {
    setEnabled(initialEnabled);
    setData(initialData);
    setConfirmOpen(false);
    toast.info(tCommon('changesDiscarded'));
  };

  const move = (direction: 'up' | 'down') => {
    startMove(async () => {
      const res = await moveHomeBlock(blockKey, direction);
      // 'noop' = block already at the top/bottom — nothing to show
      if (res.success && res.message !== 'noop') {
        toast.success(res.message);
      } else if (!res.success) {
        toast.error(res.message);
      }
    });
  };

  const tCommonSave = tCommon('save');

  const renderInput = (field: BlockField, suffix?: 'fa' | 'en') => {
    const path = suffix ? `${field.path}.${suffix}` : field.path;
    const value = getPath(data, path);
    const shared =
      'bg-transparent';
    const onChange = (v: unknown) =>
      setData((prev) => setPath(prev, path, v));

    if (field.type === 'textarea') {
      return (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={cn(shared, 'resize-none', suffix === 'fa' && 'text-right')}
          dir={suffix === 'fa' ? 'rtl' : suffix === 'en' ? 'ltr' : undefined}
        />
      );
    }
    if (field.type === 'number') {
      return (
        <Input
          type='number'
          min={1}
          max={12}
          value={typeof value === 'number' ? value : 4}
          onChange={(e) => onChange(Number(e.target.value))}
          className={shared}
        />
      );
    }
    if (field.type === 'boolean') {
      return (
        <Label className='flex h-9 items-center gap-2 text-sm font-normal'>
          <Checkbox
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {t(field.label)}
        </Label>
      );
    }
    if (field.options) {
      return (
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(shared, 'h-9 w-full rounded-md border px-2 text-sm outline-none')}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    if (field.type === 'image') {
      return (
        <div className='flex flex-wrap gap-2'>
          <Input
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder='/images/banner-2.webp'
            className={cn(shared, 'min-w-0 flex-1', suffix === 'fa' && 'text-right')}
            dir={suffix === 'fa' ? 'rtl' : suffix === 'en' ? 'ltr' : undefined}
          />
          <ImageUploadButton folder='content' onUploaded={(url) => onChange(url)} />
        </div>
      );
    }
    return (
      <Input
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className={cn(shared, suffix === 'fa' && 'text-right')}
        dir={suffix === 'fa' ? 'rtl' : suffix === 'en' ? 'ltr' : undefined}
      />
    );
  };

  return (
    <Card>
      <CardContent className='space-y-4 p-4'>
        <div className='flex items-center justify-between'>
          <h2 className='font-semibold'>{title}</h2>
          <div className='flex items-center gap-2'>
            {reorderable && (
              <div className='flex items-center'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7'
                  aria-label={t('moveUp')}
                  disabled={isMoving}
                  onClick={() => move('up')}
                >
                  {isMoving ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <ChevronUp className='h-4 w-4' />
                  )}
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7'
                  aria-label={t('moveDown')}
                  disabled={isMoving}
                  onClick={() => move('down')}
                >
                  <ChevronDown className='h-4 w-4' />
                </Button>
              </div>
            )}
            <Label className='flex items-center gap-2 text-sm font-normal'>
              <Checkbox
                checked={enabled}
                onCheckedChange={(checked) => setEnabled(checked === true)}
              />
              {t('blockEnabled')}
            </Label>
          </div>
        </div>

        <FieldGroup>
          {fields.map((field) => (
            <div
              key={field.path}
              className={cn(
                'grid gap-2',
                field.localized ? 'md:grid-cols-2' : 'w-full'
              )}
            >
              {field.localized ? (
                <>
                  <Field>
                    <FieldLabel dir='rtl' className='text-right'>
                      {t(field.label)} — {locale === 'fa' ? 'فارسی' : 'Persian'}
                    </FieldLabel>
                    {renderInput(field, 'fa')}
                  </Field>
                  <Field>
                    <FieldLabel>
                      {t(field.label)} — {locale === 'fa' ? 'انگلیسی' : 'English'}
                    </FieldLabel>
                    {renderInput(field, 'en')}
                  </Field>
                </>
              ) : (
                <Field>
                  <FieldLabel>{t(field.label)}</FieldLabel>
                  {renderInput(field)}
                </Field>
              )}
            </div>
          ))}
        </FieldGroup>

        <div className='flex flex-wrap items-center gap-2'>
          {isDirty ? (
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button disabled={isPending}>
                  {isPending ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Save className='h-4 w-4' />
                  )}
                  {tCommonSave}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('confirmSave')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('unsavedConfirm')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setConfirmOpen(false);
                      save();
                    }}
                  >
                    {tCommon('save')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button onClick={save} disabled={isPending}>
              {isPending ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Save className='h-4 w-4' />
              )}
              {tCommonSave}
            </Button>
          )}

          {isDirty && (
            <Button variant='outline' onClick={discard}>
              {t('discardChanges')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HomeBlockEditor;
