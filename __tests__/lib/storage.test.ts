// Tests for the ArvanCloud storage helper — validation logic only (no
// network; uploadImage without env set fails fast before any S3 call).

import { uploadImage, UploadError, publicAssetUrl, MAX_UPLOAD_BYTES } from '@/lib/storage';

const OLD_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...OLD_ENV };
  delete process.env.ARVAN_ACCESS_KEY;
  delete process.env.ARVAN_SECRET_KEY;
  delete process.env.ARVAN_BUCKET;
  delete process.env.ARVAN_REGION;
  delete process.env.ARVAN_PUBLIC_BASE_URL;
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe('publicAssetUrl', () => {
  it('uses the CDN base when set', () => {
    process.env.ARVAN_PUBLIC_BASE_URL = 'https://cdn.example.ir';
    process.env.ARVAN_BUCKET = 'bk';
    expect(publicAssetUrl('products/x.webp')).toBe(
      'https://cdn.example.ir/products/x.webp'
    );
  });

  it('falls back to the virtual-hosted bucket URL', () => {
    process.env.ARVAN_BUCKET = 'mybucket';
    process.env.ARVAN_REGION = 'ir-thr-at1';
    delete process.env.ARVAN_PUBLIC_BASE_URL;
    expect(publicAssetUrl('avatars/y.png')).toBe(
      'https://mybucket.s3.ir-thr-at1.arvanstorage.ir/avatars/y.png'
    );
  });
});

describe('uploadImage validation', () => {
  it('fails fast when storage is not configured', async () => {
    await expect(
      uploadImage(new File(['x'], 'a.png', { type: 'image/png' }), 'products')
    ).rejects.toThrow('storageNotConfigured');
  });

  it('rejects disallowed mime types before any S3 call', async () => {
    process.env.ARVAN_ACCESS_KEY = 'k';
    process.env.ARVAN_SECRET_KEY = 's';
    process.env.ARVAN_BUCKET = 'b';
    await expect(
      uploadImage(new File(['x'], 'a.svg', { type: 'image/svg+xml' }), 'products')
    ).rejects.toThrow('storageInvalidType');
  });

  it('rejects oversized files', async () => {
    process.env.ARVAN_ACCESS_KEY = 'k';
    process.env.ARVAN_SECRET_KEY = 's';
    process.env.ARVAN_BUCKET = 'b';
    const big = new File([new ArrayBuffer(MAX_UPLOAD_BYTES + 1)], 'a.png', {
      type: 'image/png',
    });
    await expect(uploadImage(big, 'products')).rejects.toThrow('storageTooLarge');
  });

  it('has a sane size cap', () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe('UploadError', () => {
  it('carries message keys usable for i18n', () => {
    const e = new UploadError('storageInvalidType');
    expect(e.message).toMatch(/^storage[A-Z]/);
  });
});
