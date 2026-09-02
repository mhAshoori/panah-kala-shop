// ArvanCloud object storage (S3-compatible) upload helper. Server-only.
//
// Env (see .env.example):
//   ARVAN_ACCESS_KEY / ARVAN_SECRET_KEY — access keys from the ArvanCloud console
//   ARVAN_BUCKET      — bucket name
//   ARVAN_REGION      — storage zone, e.g. ir-thr-at1 (Tehran)
//   ARVAN_PUBLIC_BASE_URL — optional CDN/custom domain; falls back to the
//                       bucket's virtual-hosted URL
//
// Public asset URLs are stored in the DB (product.images, User.image, …).

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export const ARVAN_REGION = process.env.ARVAN_REGION ?? 'ir-thr-at1';
const ARVAN_ENDPOINT = `https://s3.${ARVAN_REGION}.arvanstorage.ir`;

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.ARVAN_ACCESS_KEY &&
      process.env.ARVAN_SECRET_KEY &&
      process.env.ARVAN_BUCKET
  );
}

/** Public URL for an object key — the value stored in the DB. */
export function publicAssetUrl(key: string): string {
  const base = process.env.ARVAN_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (base) return `${base}/${key}`;
  const region = process.env.ARVAN_REGION ?? ARVAN_REGION;
  return `https://${process.env.ARVAN_BUCKET}.s3.${region}.arvanstorage.ir/${key}`;
}

// Lazy singleton — building the client without credentials throws
let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: ARVAN_REGION,
      endpoint: ARVAN_ENDPOINT,
      forcePathStyle: false,
      credentials: {
        accessKeyId: process.env.ARVAN_ACCESS_KEY ?? '',
        secretAccessKey: process.env.ARVAN_SECRET_KEY ?? '',
      },
    });
  }
  return client;
}

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export class UploadError extends Error {}

/**
 * Validate and upload one image; returns its public URL.
 * Throws UploadError with a user-safe message key on rejection.
 */
export async function uploadImage(
  file: File,
  folder: 'products' | 'avatars' | 'content'
): Promise<string> {
  if (!isStorageConfigured()) throw new UploadError('storageNotConfigured');
  if (!(file instanceof File) || file.size === 0) {
    throw new UploadError('storageInvalidFile');
  }
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError('storageTooLarge');

  // Trust the sniffed content type only when allow-listed; extension derives
  // from it, never from the client-supplied filename (path traversal safety).
  const ext = ALLOWED_MIME[file.type];
  if (!ext) throw new UploadError('storageInvalidType');

  const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  await getClient().send(
    new PutObjectCommand({
      Bucket: process.env.ARVAN_BUCKET,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: 'public, max-age=31536000, immutable',
      ACL: 'public-read',
    })
  );

  return publicAssetUrl(key);
}
