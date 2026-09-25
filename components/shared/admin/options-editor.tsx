'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Percent, Tag, Plus, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  derivePercent,
  deriveSellPrice,
  resolveMode,
  type DiscountMethod,
} from '@/lib/discount-math';
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
  // Explicit combo membership. number[] = value index per option (fresh
  // client-side rows in the create flow). Preloaded DB rows instead carry a
  // 'optIdx:valIdx;...' signature string so they can be re-attached to the
  // right cartesian row even when values were re-ordered.
  combo?: number[] | string;
  price: string;
  compareAtPrice: string;
  stock: string;
};

// A fresh row, and the on-sale state pre-filled from a stored pair. The method
// is re-derived rather than stored, matching the product-level rule (R-002).
const blankVariant = (): AdminVariant => ({
  key: '',
  price: '',
  compareAtPrice: '',
  stock: '0',
});

const modeOf = (v: AdminVariant): DiscountMethod => {
  const m = resolveMode(v.price, v.compareAtPrice);
  return m === 'none' ? 'percent' : m;
};

const valueForMode = (v: AdminVariant, mode: DiscountMethod): string => {
  if (!v.compareAtPrice) return '';
  return mode === 'percent'
    ? String(derivePercent(v.compareAtPrice, v.price) ?? '')
    : v.price;
};

// 'optIdx:valIdx;...' signature → value-index-per-option number[] for
// submission; passthrough for number[] / undefined.
const normalizeCombo = (
  combo: number[] | string | undefined
): number[] | undefined => {
  if (typeof combo !== 'string') return combo;
  return combo.split(';').map((part) => Number(part.split(':')[1]));
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

  const hasDiversity = options.length > 0 && options.every((o) => o.values.length > 0);

  // Variants may carry a pre-computed combo signature string
  // 'optIdx:valIdx;optIdx:valIdx...' (snapshot from the DB row) — use it to
  // place each saved variant on the right cartesian row, in any option
  // order. Rows without a signature keep positional placement (create mode).
  const rowBySignature = useMemo(() => {
    const map = new Map<string, AdminVariant>();
    for (const v of variants) {
      if (!v.combo) continue;
      const sig = Array.isArray(v.combo)
        ? '' // fresh client-side combo (number[] — create flow)
        : String(v.combo);
      if (sig) map.set(sig, v);
    }
    return map;
  }, [variants]);

  const signatureFor = (combo: number[]) =>
    combo.map((valIdx, optIdx) => `${optIdx}:${valIdx}`).join(';');

  const [enabledRows, setEnabledRows] = useState<boolean[]>([]);
  const preloadedKeys = useMemo(
    () =>
      variants.length
        ? new Set(
            variants
              .map((v) => (typeof v.combo === 'string' ? v.combo : ''))
              .filter(Boolean)
          )
        : null,
    [variants]
  );
  if (enabledRows.length !== combos.length) {
    // render-time resize (no effect).
    // First render with preloaded signature rows: enable only saved combos.
    // Otherwise default every row on and keep any admin toggles made.
    setEnabledRows(
      combos.map((combo, i) =>
        preloadedKeys && enabledRows.length === 0
          ? preloadedKeys.has(signatureFor(combo))
          : (enabledRows[i] ?? true)
      )
    );
  }

  // Sparse combos (multi-option products): a checkbox per cartesian row lets
  // the admin leave only the sold combinations on. Disabled rows are dropped
  // from the payload — sparse listings are safe server-side.
  const sparseMode = options.length > 1;

  // Align variants against combos: preloaded rows are matched by signature,
  // otherwise fall back to the old positional mapping.
  const alignedVariants: AdminVariant[] = useMemo(() => {
    return combos.map((combo, i) => {
      const sig = signatureFor(combo);
      const preloaded = rowBySignature.get(sig);
      if (preloaded) return { ...preloaded, combo };
      return {
        ...(variants[i] ?? blankVariant()),
        combo,
      };
    });
  }, [combos, variants, rowBySignature]);

  // Disabled rows are dropped from the submitted payload. Preloaded string
  // signatures resolve back to number[] (server action only accepts indexes).
  const activeVariants = alignedVariants
    .map((v, i) => ({ ...v, combo: normalizeCombo(v.combo) }))
    .filter((_, i) => enabledRows[i] ?? true);

  const setVariant = (idx: number, patch: Partial<AdminVariant>) =>
    setVariants((prev) => {
      const next = [...prev];
      next[idx] = { ...(next[idx] ?? blankVariant()), ...patch };
      return next;
    });

  // Per-row method, the value the admin actually typed, and the BASE price.
  // Kept apart from `variants` because the first two are DERIVED from the
  // stored pair, and re-deriving on every render would discard what was typed.
  // The base is the original price when the row is discounted and the selling
  // price when it is not, mirroring the product form.
  const [rowMode, setRowMode] = useState<DiscountMethod[]>([]);
  const [rowValue, setRowValue] = useState<string[]>([]);
  const [rowBase, setRowBase] = useState<string[]>([]);

  // Seed all three from the stored pair once, so a preloaded row opens showing
  // the admin's own numbers rather than a re-derived guess.
  const [seeded, setSeeded] = useState(false);
  if (!seeded && variants.length > 0) {
    setRowMode(variants.map((v) => modeOf(v)));
    setRowValue(variants.map((v) => valueForMode(v, modeOf(v))));
    setRowBase(variants.map((v) => (v.compareAtPrice || v.price)));
    setSeeded(true);
  }

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
        value={JSON.stringify(hasDiversity ? activeVariants : [])}
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
                    {sparseMode && (
                      <th className='p-2 text-start w-10' title='فروش می‌شود / Sold'>
                        ف
                      </th>
                    )}
                    <th className='p-2 text-start'>{t('basePrice')}</th>
                    <th className='p-2 text-start'>{t('discountAmount')}</th>
                    <th className='p-2 text-start'>{t('stock')}</th>
                  </tr>
                </thead>
                <tbody>
                  {combos.map((combo, i) => (
                    <tr
                      key={i}
                      className={
                        sparseMode && !enabledRows[i]
                          ? 'border-t opacity-40'
                          : 'border-t'
                      }
                    >
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
                      {sparseMode && (
                        <td className='p-2'>
                          <input
                            type='checkbox'
                            aria-label='این ترکیب فروخته می‌شود'
                            title='این ترکیب فروخته می‌شود'
                            checked={enabledRows[i] ?? true}
                            onChange={(e) =>
                              setEnabledRows((prev) => {
                                const next = [...prev];
                                while (next.length < combos.length) next.push(true);
                                next[i] = e.target.checked;
                                return next;
                              })
                            }
                          />
                        </td>
                      )}
                      <td className='p-2'>
                        {/* This column is the BASE price, matching the product
                            form: the original price when the row is on sale,
                            and the selling price when it is not. */}
                        <Input
                          type='number'
                          step='1'
                          min='1'
                          value={rowBase[i] ?? ''}
                          onChange={(e) => setRowBase((prev) => {
                            const next = [...prev];
                            next[i] = e.target.value;
                            return next;
                          })}
                          placeholder='0'
                          className='w-28'
                        />
                      </td>
                      <td className='p-2'>
                        {/* Each row's discount is independent: its own method,
                            its own value, and nothing cascades from the
                            product or a sibling (US2, FR-012). */}
                        <div className='flex items-center gap-1.5'>
                          <Input
                            type='number'
                            step='1'
                            min='0'
                            max={rowMode[i] === 'price' ? undefined : '99'}
                            value={rowValue[i] ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setRowValue((prev) => {
                                const next = [...prev];
                                next[i] = raw;
                                return next;
                              });
                              const base = rowBase[i] ?? '';
                              if (base === '' || raw === '') {
                                setVariant(i, { price: base, compareAtPrice: '' });
                                return;
                              }
                              if (rowMode[i] === 'price') {
                                // Price mode: the typed value is the SELLING
                                // price, the base column is the original.
                                setVariant(i, { price: raw, compareAtPrice: base });
                                return;
                              }
                              // Percent mode: the selling price is derived
                              // from the base and the typed percentage.
                              const sell = deriveSellPrice(base, raw);
                              setVariant(i, {
                                price: sell == null ? base : String(sell),
                                compareAtPrice: base,
                              });
                            }}
                            placeholder='0'
                            className='w-20'
                          />
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            aria-label={
                              rowMode[i] === 'price'
                                ? t('discountByPercent')
                                : t('discountByPrice')
                            }
                            title={
                              rowMode[i] === 'price'
                                ? t('discountByPercent')
                                : t('discountByPrice')
                            }
                            onClick={() => {
                              const v = alignedVariants[i];
                              const base = rowBase[i] ?? '';
                              const next: DiscountMethod =
                                rowMode[i] === 'price' ? 'percent' : 'price';
                              // Carry the pair across the switch so nothing is
                              // retyped (FR-021): percent mode gets the
                              // percentage the pair implies, price mode the
                              // selling price.
                              const carried =
                                base && v.compareAtPrice
                                  ? rowMode[i] === 'price'
                                    ? String(derivePercent(base, v.price) ?? '')
                                    : v.price
                                  : '';
                              setRowMode((prev) => {
                                const next2 = [...prev];
                                next2[i] = next;
                                return next2;
                              });
                              setRowValue((prev) => {
                                const next2 = [...prev];
                                next2[i] = carried;
                                return next2;
                              });
                            }}
                          >
                            {rowMode[i] === 'price' ? (
                              <Percent className='h-4 w-4' />
                            ) : (
                              <Tag className='h-4 w-4' />
                            )}
                          </Button>
                        </div>
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
