'use client';

import { useState } from 'react';
import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { updateHomeBlock } from '@/lib/actions/home.actions';
import { cn } from '@/lib/utils';

export type BlockField = {
  /** Dot-path into the block object, e.g. "title.fa" or "limit" */
  path: string;
  /** i18n label key under the admin namespace */
  label: string;
  type: 'text' | 'textarea' | 'number' | 'image';
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
  const child = (typeof obj[head] === 'object' && obj[head] !== null
    ? (obj[head] as BlockData)
    : {}) as BlockData;
  return { ...obj, [head]: setPath(child, rest.join('.'), value) };
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
}: {
  blockKey: string;
  title: string;
  fields: BlockField[];
  initialEnabled: boolean;
  initialData: BlockData;
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [data, setData] = useState<BlockData>(initialData);
  const [isPending, startTransition] = useTransition();

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
    return (
      <Input
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.type === 'image' ? '/images/banner-2.webp' : undefined}
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
          <Label className='flex items-center gap-2 text-sm font-normal'>
            <Checkbox
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked === true)}
            />
            {t('blockEnabled')}
          </Label>
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

        <Button onClick={save} disabled={isPending}>
          {isPending ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Save className='h-4 w-4' />
          )}
          {tCommonSave}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HomeBlockEditor;
