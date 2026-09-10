import { NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

// GET /api/health — liveness/readiness probe for uptime monitors (and the
// VPS nginx/systemd checks in docs/DEPLOYMENT.md). Verifies the app can
// reach the database (Neon connections drop intermittently on Iranian
// networks — this makes that visible to monitoring, not just users).
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', db: 'up' });
  } catch {
    return NextResponse.json({ status: 'degraded', db: 'down' }, { status: 503 });
  }
}
