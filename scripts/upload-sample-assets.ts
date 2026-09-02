// One-off: upload sample product images to ArvanCloud and print their URLs.
// Usage: npx tsx --env-file=.env scripts/upload-sample-assets.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';

const region = process.env.ARVAN_REGION ?? 'ir-thr-at1';
const bucket = process.env.ARVAN_BUCKET!;
const s3 = new S3Client({
  region,
  endpoint: `https://s3.${region}.arvanstorage.ir`,
  credentials: {
    accessKeyId: process.env.ARVAN_ACCESS_KEY!,
    secretAccessKey: process.env.ARVAN_SECRET_KEY!,
  },
});

const files = [
  { src: 'public/images/sample-products/p1.webp', key: 'products/mackbook-air-m3.webp' },
  { src: 'public/images/sample-products/p2.webp', key: 'products/asus-rog-strix-g16.webp' },
  { src: 'public/images/sample-products/p3.webp', key: 'products/sony-wh1000xm5.webp' },
  { src: 'public/images/sample-products/p4.webp', key: 'products/galaxy-s24-ultra.webp' },
  { src: 'public/images/banner-1.webp', key: 'content/banner-1.webp' },
  { src: 'public/images/banner-2.webp', key: 'content/banner-2.webp' },
];

const base = process.env.ARVAN_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  `https://${bucket}.s3.${region}.arvanstorage.ir`;

for (const f of files) {
  const body = readFileSync(f.src);
  await s3.send(new PutObjectCommand({
    Bucket: bucket, Key: f.key, Body: body,
    ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable',
    ACL: 'public-read',
  }));
  console.log(`${base}/${f.key}`);
}
