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

// Two-level tree: each main category gets subcategories
const SUBCATEGORY_NAMES: Record<string, { name: string; nameFa: string }[]> = {
  'Mobile Phones': [
    { name: 'Android Phones', nameFa: 'گوشی اندروید' },
    { name: 'iPhones', nameFa: 'گوشی اپل' },
    { name: 'Feature Phones', nameFa: 'گوشی ساده' },
  ],
  Laptops: [
    { name: 'Ultrabooks', nameFa: 'التسبوک' },
    { name: 'Gaming Laptops', nameFa: 'لپ تاپ گیمینگ' },
  ],
  Audio: [
    { name: 'Headphones', nameFa: 'هدفون و هدست' },
    { name: 'Earbuds', nameFa: 'هندزفری بی‌سیم' },
    { name: 'Speakers', nameFa: 'اسپیکر' },
  ],
  Wearables: [
    { name: 'Smart Watches', nameFa: 'ساعت هوشمند' },
    { name: 'Smart Bands', nameFa: 'دستبند هوشمند' },
  ],
  Tablets: [
    { name: 'Android Tablets', nameFa: 'تبلت اندروید' },
    { name: 'iPads', nameFa: 'آیپد' },
  ],
  Cameras: [
    { name: 'DSLR', nameFa: 'دوربین دیجیتال' },
    { name: 'Action Cameras', nameFa: 'دوربین ورزشی' },
  ],
  Monitors: [
    { name: 'Gaming Monitors', nameFa: 'مانیتور گیمینگ' },
    { name: 'Office Monitors', nameFa: 'مانیتور اداری' },
  ],
  Gaming: [
    { name: 'Consoles', nameFa: 'کنسول بازی' },
    { name: 'Accessories', nameFa: 'لوازم جانبی گیمینگ' },
  ],
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

    // Main categories (curated, with icons + display order)
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

    const mainCategories = [...distinctCategories.entries()].map(
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

    await prisma.category.createMany({ data: mainCategories });
    const mainRows = await prisma.category.findMany({
      where: { parentId: null },
    });
    const mainIdByName = new Map(mainRows.map((c) => [c.name, c.id]));

    // Subcategories under each main
    const subs: {
      slug: string;
      name: string;
      nameFa: string;
      icon: string;
      sortOrder: number;
      parentId: string;
    }[] = [];
    for (const main of mainRows) {
      const children = SUBCATEGORY_NAMES[main.name] ?? [
        { name: 'General', nameFa: 'عمومی' },
      ];
      children.forEach((sub, index) => {
        subs.push({
          slug: `${main.slug}-${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: sub.name,
          nameFa: sub.nameFa,
          icon: main.icon,
          sortOrder: index,
          parentId: main.id,
        });
      });
    }
    await prisma.category.createMany({ data: subs });
    const subRows = await prisma.category.findMany({
      where: { parentId: { not: null } },
    });
    // Map "main name" -> first sub id (products attach to a subcategory)
    const firstSubIdByMain = new Map<string, string>();
    for (const sub of subRows) {
      const mainId = sub.parentId!;
      const main = mainRows.find((m) => m.id === mainId)!;
      if (!firstSubIdByMain.has(main.name)) {
        firstSubIdByMain.set(main.name, sub.id);
      }
    }

    // Products attach to a subcategory of their main category
    await prisma.product.createMany({
      data: sampleData.products.map((p, index) => ({
        ...p,
        categoryId: mainIdByName.get(p.category) ?? null,
        subCategoryId:
          firstSubIdByMain.get(p.category) ??
          mainIdByName.get(p.category) ??
          null,
        codAvailable: index < 4,
      })),
    });

    await prisma.user.createMany({ data: sampleData.users });

    // Sample saved addresses (checkout requires a default address)
    const createdUsers = await prisma.user.findMany({
      select: { id: true, email: true },
    });
    for (const u of createdUsers) {
      await prisma.address.create({
        data: {
          userId: u.id,
          isDefault: true,
          fullName: u.email === 'admin@example.com' ? 'مدیر سیستم' : 'Jan Doe',
          streetAddress: 'خیابان ولیعصر، پلاک ۱',
          city: 'تهران',
          province: 'تهران',
          postalCode: '1234567890',
          phone: '09120000000',
        },
      });
    }

    console.log(
      `Database seeded successfully (${mainRows.length} main categories, ${subRows.length} subcategories, ${sampleData.products.length} products)`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main();
