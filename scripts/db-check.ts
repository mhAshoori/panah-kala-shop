import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const [products, users, categories, orders, carts, reviews, addresses] =
    await Promise.all([
      prisma.product.count(),
      prisma.user.count(),
      prisma.category.count(),
      prisma.order.count(),
      prisma.cart.count(),
      prisma.review.count(),
      prisma.address.count(),
    ]);

  console.log({ products, users, categories, orders, carts, reviews, addresses });

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  console.log('admin:', admin?.email, admin?.mobile, 'name:', admin?.name);

  await prisma.$disconnect();
}

main();
