'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { cartesian } from '@/lib/variants';

export type AdminOptionValue = { value: string; valueFa: string; hex: string };
export type AdminOption = {
  name: string;
  nameFa: string;
  values: AdminOptionValue[];
};
export type AdminVariant = {
  key: string;
  price: string;
  compareAtPrice: string;
  stock: string;
};

/**
 * Options editor + auto-generated combinations table.
 * State lives here; the parent form just renders two hidden inputs with the
 * serialized JSON (same pattern as the images hidden input).
 */
const OptionsEditor = ({
  initialOptions = [],
  initialVariants = [],
}: {
  initialOptions?: AdminOption[];
  initialVariants?: AdminVariant[];
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  const [options, setOptions] = useState<AdminOption[]>(initialOptions);
  const [variants, setVariants] = useState<AdminVariant[]>(initialVariants);

  const updateOption = (idx: number, patch: Partial<AdminOption>) =>
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, ...patch } : o))
    );

  const updateValue = (
    optIdx: number,
    valIdx: number,
    patch: Partial<AdminOptionValue>
  ) =>
    setOptions((prev) =>
      prev.map((o, i) =>
        i === optIdx
          ? {
              ...o,
              values: o.values.map((v, j) =>
                j === valIdx ? { ...v, ...patch } : v
              ),
            }
          : o
      )
    );

  // Adding/removing values changes the combo grid — pad/truncate variants,
  // preserving previously entered rows when the option set is unchanged.
  const combos = useMemo(
    () => cartesian(options.map((o) => o.values.map((_, i) => i))),
    [options]
  );

  // Keep variants aligned with the combo count (positional mapping)
  const alignedVariants: AdminVariant[] = useMemo(() => {
    return combos.map(
      (_, i) =>
        variants[i] ?? { key: '', price: '', compareAtPrice: '', stock: '0' }
    );
  }, [combos, variants]);

  const setVariant = (idx: number, patch: Partial<AdminVariant>) =>
    setVariants((prev) => {
      const next = [...prev];
      next[idx] = { ...(next[idx] ?? { key: '', price: '', compareAtPrice: '', stock: '0' }), ...patch };
      return next;
    });

  const hasDiversity = options.length > 0 && options.every((o) => o.values.length > 0);

  return (
    <div className='space-y-4'>
      <input
        type='hidden'
        name='optionsJson'
        value={JSON.stringify(hasDiversity ? options : [])}
      />
      <input
        type='hidden'
        name='variantsJson'
        value={JSON.stringify(hasDiversity ? alignedVariants : [])}
      />

      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-semibold'>{t('options')}</h3>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() =>
            setOptions((prev) => [
              ...prev,
              { name: 'color', nameFa: 'رنگ', values: [] },
            ])
          }
        >
          <Plus className='h-4 w-4' />
          {t('addOption')}
        </Button>
      </div>

      {options.map((option, optIdx) => (
        <Card size='sm' key={optIdx}>
          <CardContent className='space-y-3'>
            <div className='flex items-end gap-2'>
              <Field className='flex-1'>
                <FieldLabel>{t('optionNameEn')}</FieldLabel>
                <Input
                  value={option.name}
                  onChange={(e) => updateOption(optIdx, { name: e.target.value })}
                  placeholder='color'
                />
              </Field>
              <Field className='flex-1'>
                <FieldLabel>{t('optionNameFa')}</FieldLabel>
                <Input
                  value={option.nameFa}
                  onChange={(e) => updateOption(optIdx, { nameFa: e.target.value })}
                  placeholder='رنگ'
                />
              </Field>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label={tCommon('delete')}
                onClick={() =>
                  setOptions((prev) => prev.filter((_, i) => i !== optIdx))
                }
              >
                <Trash2 className='h-4 w-4 text-destructive' />
              </Button>
            </div>

            <div className='space-y-2'>
              {option.values.map((v, valIdx) => (
                <div key={valIdx} className='flex items-center gap-2'>
                  <input
                    type='color'
                    value={/^#[0-9a-fA-F]{6}$/.test(v.hex) ? v.hex : '#888888'}
                    onChange={(e) =>
                      updateValue(optIdx, valIdx, { hex: e.target.value })
                    }
                    aria-label={t('colorHex')}
                    className='h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1'
                  />
                  <Input
                    value={v.valueFa}
                    onChange={(e) =>
                      updateValue(optIdx, valIdx, { valueFa: e.target.value })
                    }
                    placeholder='آبی'
                    className='w-32'
                  />
                  <Input
                    value={v.value}
                    onChange={(e) =>
                      updateValue(optIdx, valIdx, { value: e.target.value })
                    }
                    placeholder='Blue'
                    dir='ltr'
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    aria-label={tCommon('delete')}
                    onClick={() =>
                      updateOption(optIdx, {
                        values: option.values.filter((_, j) => j !== valIdx),
                      })
                    }
                  >
                    <X className='h-4 w-4 text-destructive' />
                  </Button>
                </div>
              ))}
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() =>
                  updateOption(optIdx, {
                    values: [
                      ...option.values,
                      { value: '', valueFa: '', hex: '#888888' },
                    ],
                  })
                }
              >
                <Plus className='h-4 w-4' />
                {t('addValue')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {hasDiversity && (
        <Card size='sm'>
          <CardContent className='space-y-2'>
            <h3 className='text-sm font-semibold'>{t('variantsTable')}</h3>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-start text-muted-foreground'>
                    <th className='p-2 text-start'>{t('optionCombo')}</th>
                    <th className='p-2 text-start'>
                      {t('price')}
                    </th>
                    <th className='p-2 text-start'>{t('compareAtPrice')}</th>
                    <th className='p-2 text-start'>{t('stock')}</th>
                  </tr>
                </thead>
                <tbody>
                  {combos.map((combo, i) => (
                    <tr key={i} className='border-t'>
                      <td className='p-2'>
                        <div className='flex items-center gap-1.5'>
                          {combo.map((valIdx, optIdx) => {
                            const v = options[optIdx].values[valIdx];
                            return (
                              <span
                                key={optIdx}
                                className='flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs'
                              >
                                <span
                                  className='h-3 w-3 rounded-full border'
                                  style={{ background: v.hex || '#888888' }}
                                />
                                {v.valueFa || v.value}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className='p-2'>
                        <Input
                          type='number'
                          step='0.01'
                          min='0'
                          value={alignedVariants[i].price}
                          onChange={(e) => setVariant(i, { price: e.target.value })}
                          placeholder='0.00'
                          className='w-28'
                        />
                      </td>
                      <td className='p-2'>
                        <Input
                          type='number'
                          step='0.01'
                          min='0'
                          value={alignedVariants[i].compareAtPrice}
                          onChange={(e) =>
                            setVariant(i, { compareAtPrice: e.target.value })
                          }
                          className='w-28'
                        />
                      </td>
                      <td className='p-2'>
                        <Input
                          type='number'
                          min='0'
                          value={alignedVariants[i].stock}
                          onChange={(e) => setVariant(i, { stock: e.target.value })}
                          className='w-20'
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className='text-xs text-muted-foreground'>
              {t('variantsHint')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OptionsEditor;
