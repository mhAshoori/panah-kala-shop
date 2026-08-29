import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

// Prisma 7 uses driver adapters. Works with the local Docker Postgres in dev
// and with Neon (or any hosted Postgres) in production — just set DATABASE_URL.
function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? '';
  // Silence the pg SSL-mode deprecation warning for hosted providers while
  // keeping the current verify-full semantics (safe default for Neon).
  if (/neon\.tech|sslmode=require|sslmode=prefer/.test(url) && !/uselibpqcompat/.test(url)) {
    return url.includes('?')
      ? `${url}&uselibpqcompat=true`
      : `${url}?uselibpqcompat=true`;
  }
  return url;
}

// Extends the PrismaClient with a custom result transformer to convert the
// price and rating Decimal fields to strings.
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: resolveDatabaseUrl() }),
}).$extends({
  result: {
    product: {
      price: {
        compute(product) {
          return product.price.toString();
        },
      },
      rating: {
        compute(product) {
          return product.rating.toString();
        },
      },
    },
  },
});
