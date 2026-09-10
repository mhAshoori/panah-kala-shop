import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { toCsv } from '@/lib/csv';

// GET /api/admin/export/products?limit=N — admin-only CSV of the catalog.
// Default all (max 10000).

const HEADERS = [
  'id',
  'slug',
  'name',
  'nameFa',
  'brand',
  'category',
  'categoryFa',
  'subCategory',
  'subSubCategory',
  'price',
  'compareAtPrice',
  'stock',
  'rating',
  'numReviews',
  'isFeatured',
  'codAvailable',
  'createdAt',
];

const esc = (v: unknown) => (v == null ? '' : v instanceof Date ? v.toISOString() : String(v));

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? '10000');
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 10000)
    : 10000;

  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      subCategoryRef: { select: { name: true, nameFa: true } },
      subSubCategoryRef: { select: { name: true, nameFa: true } },
    },
  });

  const rows = products.map((p) => [
    p.id,
    p.slug,
    p.name,
    p.nameFa,
    p.brand,
    p.category,
    p.categoryFa,
    p.subCategoryRef?.nameFa || p.subCategoryRef?.name || '',
    p.subSubCategoryRef?.nameFa || p.subSubCategoryRef?.name || '',
    p.price,
    p.compareAtPrice,
    p.stock,
    p.rating,
    p.numReviews,
    p.isFeatured ? 'yes' : 'no',
    p.codAvailable ? 'yes' : 'no',
    p.createdAt,
  ]);

  const csv = toCsv(HEADERS, rows.map((r) => r.map(esc)));

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
