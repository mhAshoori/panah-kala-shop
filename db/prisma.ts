import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

// Prisma 7 uses driver adapters; pg adapter connects to the local Docker Postgres.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Extends the PrismaClient with a custom result transformer to convert the
// price and rating Decimal fields to strings.
export const prisma = new PrismaClient({ adapter }).$extends({
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
