import { prisma } from './prisma';
import sampleData, { type SampleProduct } from './sample-data';
import { buildVariantKey, recomputeParent } from '../lib/variants';

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
  Stationery: 'pencil',
  Bags: 'briefcase',
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
  Stationery: [
    { name: 'Pens', nameFa: 'خودکار' },
    { name: 'Notebooks', nameFa: 'دفتر' },
    { name: 'Pencils', nameFa: 'مداد' },
    { name: 'Mechanical Pencils', nameFa: 'مداد نوکی' },
    { name: 'Erasers', nameFa: 'پاک کن' },
    { name: 'Pencil Cases', nameFa: 'جامدادی' },
    { name: 'Sharpeners', nameFa: 'مداد تراش' },
    { name: 'Sticky Notes', nameFa: 'استیکی نوت' },
  ],
  Bags: [
    { name: 'Backpacks', nameFa: 'کوله پشتی' },
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

    // Main categories: every main in the SUBCATEGORY_NAMES tree is created
    // (electronics stay alongside the new Stationery/Bags), ordered by the
    // tree, with fa names from the products or the fallback map.
    const mainFaByName: Record<string, string> = {
      'Mobile Phones': 'گوشی موبایل',
      Laptops: 'لپ‌تاپ',
      Audio: 'صوتی',
      Wearables: 'پوشیدنی',
      Tablets: 'تبلت',
      Cameras: 'دوربین',
      Monitors: 'مانیتور',
      Gaming: 'کنسول بازی',
      Stationery: 'نوشت‌افزار',
      Bags: 'کیف',
    };
    const mainNames = Object.keys(SUBCATEGORY_NAMES);
    const mainCategories = mainNames.map((name, index) => ({
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      name,
      nameFa: mainFaByName[name] ?? name,
      icon: CATEGORY_ICONS[name] ?? 'package',
      sortOrder: index,
    }));

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

    // Subcategory lookup: "MainName/SubName" -> id (products pick exactly)
    const subIdByPath = new Map<string, string>();
    for (const sub of subRows) {
      const main = mainRows.find((m) => m.id === sub.parentId)!;
      subIdByPath.set(`${main.name}/${sub.name}`, sub.id);
    }

    // Products attach to their subcategory; option/value/variant rows are
    // created per product, then the parent price/stock are derived.
    for (const [index, p] of sampleData.products.entries()) {
      // subCategory is seed-only routing info, not a Product column
      const { subCategory: _subCategory, ...productData } = p;
      const product = await prisma.product.create({
        data: {
          ...productData,
          // Required by the schema; overwritten by the derived values below
          stock: 0,
          price: '0',
          categoryId: mainIdByName.get(p.category) ?? null,
          subCategoryId:
            subIdByPath.get(`${p.category}/${p.subCategory}`) ??
            mainIdByName.get(p.category) ??
            null,
          codAvailable: p.codAvailable ?? index < 4,
          options: undefined,
        },
      });

      const variantRows: { price: string; compareAtPrice: string | null; stock: number }[] = [];
      for (const [optIdx, option] of (p.options ?? []).entries()) {
        const createdOption = await prisma.productOption.create({
          data: {
            productId: product.id,
            name: option.name,
            nameFa: option.nameFa,
            sortOrder: optIdx,
          },
        });
        const createdValues: { id: string; valueFa: string; hex: string | null }[] = [];
        for (const [valIdx, v] of option.values.entries()) {
          const createdValue = await prisma.productOptionValue.create({
            data: {
              optionId: createdOption.id,
              value: v.value,
              valueFa: v.valueFa,
              hex: v.hex ?? null,
              sortOrder: valIdx,
            },
          });
          createdValues.push({ id: createdValue.id, valueFa: v.valueFa, hex: v.hex ?? null });
        }

        // One variant row per value (single-option products in this catalog)
        const variantInputs = option.variants;
        if (variantInputs.length !== createdValues.length) {
          throw new Error(
            `Seed variant mismatch for ${p.slug}: ${variantInputs.length} inputs vs ${createdValues.length} values`
          );
        }
        for (const [i, v] of createdValues.entries()) {
          const input = variantInputs[i];
          await prisma.productVariant.create({
            data: {
              productId: product.id,
              key: buildVariantKey([v.id]),
              price: input.price,
              compareAtPrice: input.compareAtPrice ?? null,
              stock: input.stock,
              image: input.image ?? null,
              options: [
                {
                  optionId: createdOption.id,
                  optionFa: option.nameFa,
                  valueId: v.id,
                  valueFa: v.valueFa,
                  hex: v.hex,
                },
              ],
            },
          });
          variantRows.push({
            price: input.price,
            compareAtPrice: input.compareAtPrice ?? null,
            stock: input.stock,
          });
        }
      }

      if (variantRows.length > 0) {
        const derived = recomputeParent(variantRows);
        await prisma.product.update({
          where: { id: product.id },
          data: {
            price: derived.price,
            compareAtPrice: derived.compareAtPrice,
            stock: derived.stock,
          },
        });
      }
    }

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
