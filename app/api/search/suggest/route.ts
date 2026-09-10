import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { rateLimit } from '@/lib/rate-limit';

// GET /api/search/suggest?q=… — lightweight autocomplete for the header
// search. Returns up to 6 in-stock product matches (name slug thumb price).
// Public, rate-limited, no auth.

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  const rl = rateLimit(`suggest:${ip}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ suggestions: [] });
  }

  const term = q.slice(0, 60);
  const products = await prisma.product.findMany({
    where: {
      stock: { gt: 0 },
      OR: [
        { name: { contains: term, mode: 'insensitive' as const } },
        { nameFa: { contains: term } },
        { brand: { contains: term, mode: 'insensitive' as const } },
      ],
    },
    select: {
      slug: true,
      name: true,
      nameFa: true,
      brand: true,
      price: true,
      images: true,
    },
    orderBy: { numReviews: 'desc' },
    take: 6,
  });

  return NextResponse.json({
    suggestions: products.map((p) => ({
      slug: p.slug,
      name: p.nameFa || p.name,
      brand: p.brand,
      price: p.price.toString(),
      image: p.images[0] ?? null,
    })),
  });
}
