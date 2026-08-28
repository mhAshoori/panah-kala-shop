'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import slugify from 'slugify';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { createProduct, updateProduct } from '@/lib/actions/product.actions';
import { productDefaultValues } from '@/lib/constants';
import { Product } from '@/types';

const SubmitButton = ({ label }: { label: string }) => {
  const { pending } = useFormStatus();

  return (
    <Button type='submit' disabled={pending} className='w-full sm:w-auto'>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {label}
    </Button>
  );
};

const ProductForm = ({
  type,
  product,
  productId,
}: {
  type: 'Create' | 'Update';
  product?: Product;
  productId?: string;
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [images, setImages] = useState<string[]>(
    product?.images ?? productDefaultValues.images
  );
  const [imageUrl, setImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(
    product?.isFeatured ?? productDefaultValues.isFeatured
  );
  const [banner, setBanner] = useState(product?.banner ?? '');

  const action = type === 'Create' ? createProduct : updateProduct;
  const [state, formAction] = useActionState(action, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push('/admin/products');
    } else if (state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const addImage = () => {
    const url = imageUrl.trim();
    if (url === '') return;
    if (images.includes(url)) {
      setImageUrl('');
      return;
    }
    setImages((prev) => [...prev, url]);
    setImageUrl('');
  };

  return (
    <form action={formAction} className='space-y-6'>
      {type === 'Update' && <input type='hidden' name='id' value={productId} />}
      <input type='hidden' name='images' value={JSON.stringify(images)} />
      <input
        type='hidden'
        name='banner'
        value={isFeatured && banner ? banner : ''}
      />
      {isFeatured && (
        <input type='hidden' name='isFeatured' value='on' />
      )}

      <FieldGroup>
        <div className='flex flex-col gap-5 md:flex-row'>
          <Field className='w-full'>
            <FieldLabel htmlFor='name'>{t('nameEn')}</FieldLabel>
            <Input
              id='name'
              name='name'
              defaultValue={product?.name}
              placeholder='Product name (English)'
              required
            />
          </Field>
          <Field className='w-full'>
            <FieldLabel htmlFor='nameFa'>{t('nameFa')}</FieldLabel>
            <Input
              id='nameFa'
              name='nameFa'
              defaultValue={product?.nameFa}
              placeholder='نام محصول (فارسی)'
              required
            />
          </Field>
        </div>

        <Field className='max-w-md'>
          <FieldLabel htmlFor='slug'>{t('slug')}</FieldLabel>
          <div className='flex gap-2'>
            <Input
              id='slug'
              name='slug'
              defaultValue={product?.slug}
              placeholder='product-slug'
              required
            />
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                const name = (document.getElementById('name') as HTMLInputElement)?.value;
                if (name) {
                  const slugInput = document.getElementById('slug') as HTMLInputElement;
                  slugInput.value = slugify(name, { lower: true, strict: true });
                }
              }}
            >
              {t('generate')}
            </Button>
          </div>
        </Field>

        <div className='flex flex-col gap-5 md:flex-row'>
          <Field className='w-full'>
            <FieldLabel htmlFor='category'>{t('categoryEn')}</FieldLabel>
            <Input
              id='category'
              name='category'
              defaultValue={product?.category}
              placeholder='Category (English)'
              required
            />
          </Field>
          <Field className='w-full'>
            <FieldLabel htmlFor='categoryFa'>{t('categoryFa')}</FieldLabel>
            <Input
              id='categoryFa'
              name='categoryFa'
              defaultValue={product?.categoryFa}
              placeholder='دسته‌بندی (فارسی)'
              required
            />
          </Field>
        </div>

        <div className='flex flex-col gap-5 md:flex-row'>
          <Field className='w-full'>
            <FieldLabel htmlFor='brand'>{t('brand')}</FieldLabel>
            <Input
              id='brand'
              name='brand'
              defaultValue={product?.brand}
              placeholder='Brand'
              required
            />
          </Field>
          <Field className='w-full'>
            <FieldLabel htmlFor='price'>
              {t('price')} ({tCommon('currency')})
            </FieldLabel>
            <Input
              id='price'
              name='price'
              type='number'
              step='0.01'
              min='0'
              defaultValue={product?.price}
              placeholder='0.00'
              required
            />
          </Field>
          <Field className='w-full'>
            <FieldLabel htmlFor='stock'>{t('stock')}</FieldLabel>
            <Input
              id='stock'
              name='stock'
              type='number'
              min='0'
              defaultValue={product?.stock ?? 0}
              placeholder='0'
              required
            />
          </Field>
        </div>

        {/* Images (URL based; file uploads arrive with R2 integration) */}
        <Field>
          <FieldLabel>{t('images')}</FieldLabel>
          <Card size='sm'>
            <CardContent className='space-y-3'>
              <div className='flex gap-2'>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t('imageUrl')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addImage();
                    }
                  }}
                />
                <Button type='button' variant='outline' onClick={addImage}>
                  <Plus className='h-4 w-4' />
                  {t('addImage')}
                </Button>
              </div>
              {images.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {images.map((image) => (
                    <div key={image} className='relative'>
                      <Image
                        src={image}
                        alt='product image'
                        className='h-20 w-20 rounded-sm object-cover object-center'
                        width={80}
                        height={80}
                        unoptimized
                      />
                      <button
                        type='button'
                        aria-label={tCommon('cancel')}
                        className='absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white'
                        onClick={() =>
                          setImages((prev) => prev.filter((i) => i !== image))
                        }
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Field>

        {/* Featured + banner */}
        <Field>
          <Label className='flex items-center gap-2 font-normal'>
            <Checkbox
              checked={isFeatured}
              onCheckedChange={(checked) => setIsFeatured(checked === true)}
            />
            {t('featured')}
          </Label>
          {isFeatured && (
            <Card size='sm'>
              <CardContent className='space-y-3'>
                <Field>
                  <FieldLabel htmlFor='bannerInput'>{t('banner')}</FieldLabel>
                  <Input
                    id='bannerInput'
                    value={banner}
                    onChange={(e) => setBanner(e.target.value)}
                    placeholder={t('imageUrl')}
                  />
                </Field>
                {banner && (
                  <Image
                    src={banner}
                    alt='banner'
                    className='w-full rounded-sm object-cover object-center'
                    width={1920}
                    height={680}
                    unoptimized
                  />
                )}
              </CardContent>
            </Card>
          )}
        </Field>

        <div className='flex flex-col gap-5 md:flex-row'>
          <Field className='w-full'>
            <FieldLabel htmlFor='description'>{t('descriptionEn')}</FieldLabel>
            <Textarea
              id='description'
              name='description'
              defaultValue={product?.description}
              placeholder='Description (English)'
              className='resize-none'
              required
            />
          </Field>
          <Field className='w-full'>
            <FieldLabel htmlFor='descriptionFa'>{t('descriptionFa')}</FieldLabel>
            <Textarea
              id='descriptionFa'
              name='descriptionFa'
              defaultValue={product?.descriptionFa}
              placeholder='توضیحات (فارسی)'
              className='resize-none'
              required
            />
          </Field>
        </div>
      </FieldGroup>

      <div className='flex gap-2'>
        <SubmitButton label={type === 'Create' ? t('createProduct') : t('editProduct')} />
      </div>
    </form>
  );
};

export default ProductForm;
