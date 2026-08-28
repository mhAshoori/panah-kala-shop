import { prisma } from './prisma';
import sampleData from './sample-data';

// Icon keys map to lucide icons in the category dock / grids
const CATEGORY_ICONS: Record<string, string> = {
  'Mobile Phones': 'smartphone',
  Laptops: 'laptop',
  Audio: 'headphones',
  Wearables: 'watch',
  Tablets: 'tablet',
  Cameras: 'camera',
  Monitors: 'monitor',
  Gaming: 'gamepad-2',
};

async function main() {
  try {
    // Delete in FK-safe order
    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    // Categories (curated, with icons + display order)
    const distinctCategories = new Map<
      string,
      { name: string; nameFa: string }
    >();
    for (const p of sampleData.products) {
      if (!distinctCategories.has(p.category)) {
        distinctCategories.set(p.category, {
          name: p.category,
          nameFa: p.categoryFa,
        });
      }
    }

    const categories = [...distinctCategories.entries()].map(
      ([name, c], index) => ({
        slug: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        name,
        nameFa: c.nameFa,
        icon: CATEGORY_ICONS[name] ?? 'package',
        sortOrder: index,
      })
    );

    await prisma.category.createMany({ data: categories });
    const categoryRows = await prisma.category.findMany();
    const categoryBySlug = new Map(categoryRows.map((c) => [c.name, c.id]));

    // Products, linked to their category
    await prisma.product.createMany({
      data: sampleData.products.map((p) => ({
        ...p,
        categoryId: categoryBySlug.get(p.category) ?? null,
      })),
    });

    await prisma.user.createMany({ data: sampleData.users });

    console.log(
      `Database seeded successfully (${categories.length} categories, ${sampleData.products.length} products)`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main();
